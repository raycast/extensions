import { getZonedTimeParts } from "./timezone";

const WIDTH = 260;
const HEIGHT = 320;
const FACE_CX = WIDTH / 2;
const FACE_CY = 128;
const FACE_RADIUS = 112;

const CAPTION_CY = 272;
const CAPTION_HEIGHT = 52;
const CAPTION_WIDTH = 196;

function point(radius: number, angleDeg: number): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: FACE_CX + radius * Math.cos(angleRad),
    y: FACE_CY + radius * Math.sin(angleRad),
  };
}

function hand(angleDeg: number, length: number, width: number, color: string, tail = 0): string {
  const tip = point(length, angleDeg);
  const back = tail > 0 ? point(tail, angleDeg + 180) : { x: FACE_CX, y: FACE_CY };
  return `<line x1="${back.x.toFixed(2)}" y1="${back.y.toFixed(2)}" x2="${tip.x.toFixed(2)}" y2="${tip.y.toFixed(
    2,
  )}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" />`;
}

function ticks(): string {
  let marks = "";
  for (let i = 0; i < 60; i++) {
    const angle = i * 6;
    const isHour = i % 5 === 0;
    const outer = FACE_RADIUS - 4;
    const inner = isHour ? outer - 12 : outer - 6;
    const from = point(inner, angle);
    const to = point(outer, angle);
    marks += `<line x1="${from.x.toFixed(2)}" y1="${from.y.toFixed(2)}" x2="${to.x.toFixed(2)}" y2="${to.y.toFixed(
      2,
    )}" stroke="#1d1d1f" stroke-width="${isHour ? 3 : 1}" stroke-linecap="round" />`;
  }
  return marks;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function caption(hours: number, minutes: number, seconds: number): string {
  const x = (WIDTH - CAPTION_WIDTH) / 2;
  const y = CAPTION_CY - CAPTION_HEIGHT / 2;
  const label = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `<rect x="${x}" y="${y}" width="${CAPTION_WIDTH}" height="${CAPTION_HEIGHT}" rx="14" fill="#1d1d1f" />
  <text x="${FACE_CX}" y="${CAPTION_CY}" text-anchor="middle" dominant-baseline="central" font-family="Menlo, monospace" font-size="30" font-weight="700" fill="#ffffff">${label}</text>`;
}

/** Renders a classic white analog watch face with a centered digital caption, both NTP- and timezone-corrected. */
export function buildAnalogClockSvg(atomicMs: number): string {
  const { hours: hours24, minutes, seconds, ms } = getZonedTimeParts(atomicMs);
  const hours = hours24 % 12;

  const secondAngle = (seconds + ms / 1000) * 6;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const hourAngle = (hours + minutes / 60) * 30;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <circle cx="${FACE_CX}" cy="${FACE_CY}" r="${FACE_RADIUS}" fill="#ffffff" stroke="#1d1d1f" stroke-width="4" />
  ${ticks()}
  ${hand(hourAngle, FACE_RADIUS * 0.5, 6, "#1d1d1f")}
  ${hand(minuteAngle, FACE_RADIUS * 0.75, 4, "#1d1d1f")}
  ${hand(secondAngle, FACE_RADIUS * 0.82, 2, "#ff3b30", FACE_RADIUS * 0.18)}
  <circle cx="${FACE_CX}" cy="${FACE_CY}" r="5" fill="#ff3b30" />
  ${caption(hours24, minutes, seconds)}
</svg>`;
}

export function analogClockDataUri(atomicMs: number): string {
  const svg = buildAnalogClockSvg(atomicMs);
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}
