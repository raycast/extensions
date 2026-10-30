import { hash } from "./util";

/**
 * "Blueprint HUD" art style: a deep navy screen, glowing cyan wireframes, one bright focal object,
 * and the furniture of a targeting display (rounded frame, corner brackets, tiny data readouts).
 *
 * This file is the shared screen. What is drawn inside it lives in hud-scenes.ts.
 */

export const HW = 640;
export const HH = 400;

export const BLUE = {
  bg: "#0a1a3d",
  line: "#4a9dff",
  mid: "#6cb4ff",
  light: "#8fd3ff",
  pale: "#e2f3ff",
  dim: "#2a5ea8",
  deep: "#14387a",
} as const;

export type Pt = [number, number];

const n = (x: number) => Number(x.toFixed(1));
export const P = (p: Pt) => `${n(p[0])},${n(p[1])}`;

export const line = (a: Pt, b: Pt, color: string = BLUE.light, w = 1.2, extra = "") =>
  `<path d="M${P(a)}L${P(b)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;

export const path = (d: string, color: string = BLUE.light, w = 1.2, fill = "none", extra = "") =>
  `<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;

export const poly = (points: Pt[], fill: string, color: string = BLUE.light, w = 1.2, extra = "") =>
  `<polygon points="${points.map(P).join(" ")}" fill="${fill}" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" ${extra}/>`;

export const circle = (c: Pt, r: number, color: string = BLUE.light, w = 1.2, fill = "none", extra = "") =>
  `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(r)}" fill="${fill}" stroke="${color}" stroke-width="${w}" ${extra}/>`;

export const text = (x: number, y: number, size: number, s: string, color: string = BLUE.light, extra = "") =>
  `<text x="${x}" y="${y}" font-family="Menlo, Monaco, 'Courier New', monospace" font-size="${size}" fill="${color}" ${extra}>${s}</text>`;

/** A reticle: a few concentric rings, a rotating dashed ring and a crosshair with gaps. */
export function reticle(c: Pt, r: number, f: number): string {
  const [x, y] = c;
  return [
    circle(c, r * 0.12, BLUE.pale, 1.4),
    circle(c, r * 0.42, BLUE.light, 1),
    circle(c, r * 0.72, BLUE.pale, 2.2),
    circle(c, r, BLUE.light, 1, "none", `stroke-dasharray="14 9" stroke-dashoffset="${f * 6}" opacity=".8"`),
    line([x - r * 1.35, y], [x - r * 0.5, y], BLUE.light, 1, 'opacity=".7"'),
    line([x + r * 0.5, y], [x + r * 1.35, y], BLUE.light, 1, 'opacity=".7"'),
    line([x, y - r * 1.35], [x, y - r * 0.5], BLUE.light, 1, 'opacity=".7"'),
    line([x, y + r * 0.5], [x, y + r * 1.35], BLUE.light, 1, 'opacity=".7"'),
  ].join("");
}

/** Rows of tiny illegible hex, one row of which changes every frame. */
function readout(x: number, y: number, rows: number, cols: number, f: number, seed: number, anchor = "start"): string {
  let out = "";
  for (let r = 0; r < rows; r++) {
    const live = r === f % rows ? f : 0;
    let s = "";
    for (let c = 0; c < cols; c++) {
      const v = Math.floor(hash(r * 31 + c, live, seed) * 65535);
      s += v.toString(16).padStart(4, "0").toUpperCase() + " ";
    }
    out += text(
      x,
      y + r * 6.5,
      4.6,
      s.trim(),
      BLUE.mid,
      `text-anchor="${anchor}" opacity="${r === f % rows ? 0.95 : 0.55}"`,
    );
  }
  return out;
}

function bracket(x: number, y: number, dx: number, dy: number): string {
  return path(`M${x} ${y + dy * 14}V${y}H${x + dx * 14}`, BLUE.mid, 1.2, "none", 'opacity=".8"');
}

/** The screen furniture shared by every scene: frame, brackets, rulers and data readouts. */
function furniture(f: number, seed: number): string {
  let ruler = "";
  for (let i = 0; i < 16; i++) {
    const long = i % 5 === 0;
    ruler += line([28, 56 + i * 7], [long ? 36 : 33, 56 + i * 7], BLUE.mid, 0.8, 'opacity=".7"');
  }
  return [
    `<rect x="18" y="14" width="604" height="372" rx="9" fill="none" stroke="${BLUE.line}" stroke-width="1.6" opacity=".75"/>`,
    bracket(84, 52, 1, 1),
    bracket(556, 52, -1, 1),
    bracket(84, 348, 1, -1),
    bracket(556, 348, -1, -1),
    // tags, top left
    `<rect x="28" y="24" width="16" height="7" rx="1" fill="${BLUE.light}" opacity="${f % 2 ? 0.9 : 0.55}"/>`,
    `<rect x="48" y="24" width="14" height="7" rx="1" fill="none" stroke="${BLUE.mid}" stroke-width=".8"/>`,
    `<rect x="66" y="24" width="14" height="7" rx="1" fill="none" stroke="${BLUE.mid}" stroke-width=".8"/>`,
    ruler,
    readout(548, 26, 5, 3, f, seed, "start"),
    // bottom left: a gauge and a few lines
    `<rect x="28" y="346" width="34" height="5" fill="none" stroke="${BLUE.mid}" stroke-width=".8"/>`,
    `<rect x="28" y="346" width="${14 + ((f * 5) % 12)}" height="5" fill="${BLUE.light}" opacity=".8"/>`,
    readout(28, 364, 3, 3, f, seed + 1),
    readout(528, 352, 4, 3, f, seed + 2),
    // registration crosses outside the frame
    line([8, 400 - 8], [14, 400 - 8], BLUE.mid, 1),
    line([11, 400 - 11], [11, 400 - 5], BLUE.mid, 1),
    line([HW - 14, 400 - 8], [HW - 8, 400 - 8], BLUE.mid, 1),
    line([HW - 11, 400 - 11], [HW - 11, 400 - 5], BLUE.mid, 1),
  ].join("");
}

const DEFS = `<defs>
<filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="bloom" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
<radialGradient id="vignette" cx="50%" cy="50%" r="70%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".22"/></radialGradient>
<radialGradient id="flare"><stop offset="0%" stop-color="#fff" stop-opacity="1"/><stop offset="35%" stop-color="${BLUE.light}" stop-opacity=".7"/><stop offset="100%" stop-color="${BLUE.line}" stop-opacity="0"/></radialGradient>
<linearGradient id="hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2d78dc" stop-opacity=".7"/><stop offset="100%" stop-color="#0d2a62" stop-opacity=".8"/></linearGradient>
<linearGradient id="plate" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a6dcff" stop-opacity=".95"/><stop offset="100%" stop-color="#3a98ff" stop-opacity=".9"/></linearGradient>
<linearGradient id="rock" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1b4f9e" stop-opacity=".7"/><stop offset="100%" stop-color="#0c2858" stop-opacity=".85"/></linearGradient>
<linearGradient id="crystal" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d8f1ff" stop-opacity=".95"/><stop offset="100%" stop-color="#3a98ff" stop-opacity=".8"/></linearGradient>
<pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" y="2" fill="#000" opacity=".12"/></pattern>
</defs>`;

/** Wraps a scene body in the screen: background, glow, frame, scanlines and vignette. */
export function renderHud(body: (f: number) => string, frame: number, seed = 0): string {
  const f = frame % 4;
  const roll = (f * 97 + 30) % (HH + 30);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${HW}" height="${HH}" viewBox="0 0 ${HW} ${HH}">`,
    DEFS,
    `<rect width="${HW}" height="${HH}" fill="${BLUE.bg}"/>`,
    `<g filter="url(#glow)">${body(f)}</g>`,
    furniture(f, seed),
    `<rect width="${HW}" height="${HH}" fill="url(#scan)"/>`,
    `<rect y="${roll - 10}" width="${HW}" height="10" fill="${BLUE.line}" opacity=".05"/>`,
    `<rect width="${HW}" height="${HH}" fill="url(#vignette)"/>`,
    `</svg>`,
  ].join("");
}
