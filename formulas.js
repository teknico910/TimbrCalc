/**
 * TimbrCalc - Formule, Reset e Orologio Sincronizzato
 */

let timeOffsetMs = 0;

// Sincronizzazione con gestione errori per dispositivi mobile
async function syncTime() {
  try {
    const startMs = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Timeout a 2 secondi per evitare blocchi

    const response = await fetch('https://worldtimeapi.org/api/timezone/Europe/Rome', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const serverTimeMs = new Date(data.datetime).getTime();
      const endMs = Date.now();
      const latencyMs = (endMs - startMs) / 2;
      timeOffsetMs = (serverTimeMs + latencyMs) - endMs;
      
      const tag = document.querySelector('.clock-sync-tag');
      if (tag) tag.textContent = 'Sincronizzato';
    }
  } catch (err) {
    // Se la chiamata fallisce (file locale / offline / CORS mobile), usa l'ora locale del dispositivo
    timeOffsetMs = 0;
    const tag = document.querySelector('.clock-sync-tag');
    if (tag) tag.textContent = 'Ora Locale';
  }
}

function updateClock() {
  const now = new Date(Date.now() + timeOffsetMs);

  const optionsDate = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  const dateStr = now.toLocaleDateString('it-IT', optionsDate);

  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${h}:${m}:${s}`;

  const dateEl = document.getElementById('live-date');
  const timeEl = document.getElementById('live-time');

  if (dateEl) dateEl.textContent = dateStr;
  if (timeEl) timeEl.textContent = timeStr;
}

function startClockEngine() {
  syncTime();
  setInterval(syncTime, 300000);
  setInterval(updateClock, 1000);
  updateClock();
}

function timeToMinutes(timeStr) {
  if (!timeStr || timeStr === "" || timeStr === "0") return 0;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function minutesToTime(mins) {
  if (isNaN(mins)) return "00:00";
  const sign = mins < 0 ? "-" : "";
  const absMins = Math.abs(mins);
  const h = String(Math.floor(absMins / 60)).padStart(2, '0');
  const m = String(absMins % 60).padStart(2, '0');
  return `${sign}${h}:${m}`;
}

function renderValue(elementId, minsValue) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = minutesToTime(minsValue);
  
  if (minsValue < 0) {
    el.classList.add('val-negative');
  } else {
    el.classList.remove('val-negative');
  }
}

function calcolaC8(f2Str) {
  const f2 = timeToMinutes(f2Str);
  if (f2 === 0) return 0;
  return Math.max(f2, 420) + 360;
}

function calcolaC15(f4Str, c8Mins) {
  const f4 = timeToMinutes(f4Str);
  if (f4 === 0) return 0;
  return f4 - c8Mins;
}

function calcolaF8(f2Str, f10Str, f11Str) {
  const f2 = timeToMinutes(f2Str);
  if (f2 === 0) return 0;

  const f10 = timeToMinutes(f10Str);
  const f11 = timeToMinutes(f11Str);

  let quotaPausa = 0;
  if (f10 === 0 || f11 === 0) {
    quotaPausa = 60;
  } else {
    quotaPausa = Math.max(f11 - f10, 30);
  }

  return Math.max(f2, 420) + 540 + quotaPausa;
}

function calcolaTicket(f10Str, f11Str) {
  const f10 = timeToMinutes(f10Str);
  const f11 = timeToMinutes(f11Str);

  const badgeEl = document.getElementById('ticket_pranzo_status');
  if (!badgeEl) return;

  if (f10 === 0 || f11 === 0 || f11 <= f10) {
    badgeEl.textContent = "SI / NO";
    badgeEl.className = "ticket-badge ticket-default";
    return;
  }

  const diffPausa = f11 - f10;

  if (diffPausa <= 29) {
    badgeEl.textContent = "NO";
    badgeEl.className = "ticket-badge ticket-no";
  } else if (diffPausa >= 30) {
    badgeEl.textContent = "SI";
    badgeEl.className = "ticket-badge ticket-yes";
  }
}

function calcolaF15(f4Str, f8Mins) {
  const f4 = timeToMinutes(f4Str);
  if (f4 === 0 || f8Mins === 0) return 0;
  return f4 - f8Mins;
}

function runCalculations() {
  const f2 = document.getElementById('f2_entrata').value;
  const f4 = document.getElementById('f4_uscita').value;
  const f10 = document.getElementById('f10_pausa_out').value;
  const f11 = document.getElementById('f11_pausa_in').value;

  const c8Mins = calcolaC8(f2);
  const c15Mins = calcolaC15(f4, c8Mins);
  renderValue('c8_uscita_prevista', c8Mins);
  renderValue('c15_flessibilita', c15Mins);

  const f8Mins = calcolaF8(f2, f10, f11);
  const f15Mins = calcolaF15(f4, f8Mins);
  renderValue('f8_uscita_prevista', f8Mins);
  renderValue('f15_flessibilita', f15Mins);

  calcolaTicket(f10, f11);
}

function resetAll() {
  document.getElementById('f2_entrata').value = "00:00";
  document.getElementById('f4_uscita').value = "00:00";
  document.getElementById('f10_pausa_out').value = "00:00";
  document.getElementById('f11_pausa_in').value = "00:00";
  runCalculations();
}

document.addEventListener('DOMContentLoaded', () => {
  // Aggancia l'evento input per la risposta immediata su tastiere mobile
  const timeInputs = document.querySelectorAll('input[type="time"]');
  timeInputs.forEach(input => {
    input.addEventListener('input', runCalculations);
  });

  runCalculations();
  startClockEngine();
});