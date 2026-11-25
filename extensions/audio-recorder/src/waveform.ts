interface WaveformState {
  state: string;
  duration: number;
  waveform?: number[];
  microphonePeak?: number;
  systemPeak?: number;
  mode: string;
}
function amplitude(peak = 0) {
  return Number.isFinite(peak) && peak > 0 ? Math.max(0, Math.min(1, (20 * Math.log10(peak) + 60) / 60)) : 0;
}
export function waveformImage(state: WaveformState, dark: boolean): string {
  const ink = dark ? "#f4f4f5" : "#242529";
  const secondary = dark ? "#b4b7c0" : "#60636d";
  const line = dark ? "#474950" : "#d7d9df";
  const paused = state.state === "paused";
  const accent = paused ? (dark ? "#d5aa69" : "#976322") : dark ? "#ff6776" : "#b51d3a";
  const values = (state.waveform || []).slice(-80);
  const offset = 80 - values.length;
  const bars = Array.from({ length: 80 }, (_, i) => {
    const height = amplitude(values[i - offset]) * 88;
    const x = 28 + i * 7.4;
    return height > 0
      ? `<rect x="${x.toFixed(1)}" y="${(170 - height / 2).toFixed(1)}" width="4" height="${height.toFixed(1)}" rx="2" fill="${accent}" opacity="${(0.8 + i / 395).toFixed(2)}"/>`
      : `<circle cx="${(x + 2).toFixed(1)}" cy="170" r="1" fill="${line}"/>`;
  }).join("");
  const time = [
    Math.floor(state.duration / 3600),
    Math.floor(state.duration / 60) % 60,
    Math.floor(state.duration) % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  function meter(x: number, title: string, peak: number, enabled: boolean) {
    const p = paused || !enabled ? 0 : peak;
    const label = !enabled ? "Off" : paused ? "Paused" : p > 0 ? `${Math.round(20 * Math.log10(p))} dB` : "No signal";
    return `<text x="${x}" y="267" fill="${ink}" font-size="14" font-weight="500">${title}</text><text x="${x + 268}" y="267" fill="${secondary}" font-size="13" text-anchor="end">${label}</text><rect x="${x}" y="281" width="268" height="6" rx="3" fill="${line}"/><rect x="${x}" y="281" width="${(amplitude(p) * 268).toFixed(1)}" height="6" rx="3" fill="${dark ? "#67cb9d" : "#208352"}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="300" viewBox="0 0 640 300"><g font-family="-apple-system, BlinkMacSystemFont, Helvetica Neue, Helvetica, sans-serif"><text x="28" y="30" fill="${ink}" font-size="23" font-weight="600">${paused ? "Recording paused" : "Recording"}</text><circle cx="605" cy="22" r="7" fill="${accent}"/><text x="24" y="96" fill="${ink}" font-size="56" font-weight="300" font-variant-numeric="tabular-nums" letter-spacing="-1">${time}</text>${bars}<text x="28" y="236" fill="${secondary}" font-size="12">Last 8 seconds · captured audio</text><text x="616" y="236" fill="${secondary}" font-size="12" text-anchor="end">${paused ? "Paused" : "Live"}</text>${meter(28, "Microphone", state.microphonePeak || 0, state.mode !== "system")}${meter(348, "System audio", state.systemPeak || 0, state.mode !== "microphone")}</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
