/**
 * "Sand globe" dial renderer. Pure module (no @raycast/api): produces self-contained SVG strings.
 * A glass sphere fills with dune-shaped sand as time elapses. Motion uses SMIL and CSS animations, with phases derived
 * from the wall clock (`nowMs`) so that a freshly rendered SVG continues exactly where the previous one stopped.
 */
import type { Theme, TimerStatus } from "./types.ts";

export interface DialOptions {
  remainingMs: number;
  totalMs: number;
  status: TimerStatus | "idle";
  theme: Theme;
  /** Shown small above the digits (e.g. "Focus"). */
  label?: string;
  /** Shown below the sphere, e.g. "Ends at 3:42 PM". */
  caption?: string;
  /** Default true. When false all <text> is omitted. */
  showDigits?: boolean;
  /** Wider 1000x420 card for the full-width Detail view (same sphere, quiet extra backdrop). Default false (700x420). */
  wide?: boolean;
  /** Wall clock used to derive animation phases (default Date.now()). */
  nowMs?: number;
  /** Default true. False = no animation, a static frame. */
  animate?: boolean;
  /** Epoch ms when the sand began flowing for the current running phase (start, restart, resume): start transition. */
  flowStartMs?: number;
  /** Epoch ms when the flow stopped (pause or finish): stop transition while paused or finished. */
  flowStopMs?: number;
}

const W = 700;
const H = 420;
const WIDE_W = 1000;
const CY = 188;
const R = 168;
const BOTTOM = CY + R;
const FONT = "'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif";
const NPTS = 9;
const SPLINE = "0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1";
const SPLINE2 = "0.45 0 0.55 1;0.45 0 0.55 1";

const DUNE_A = [0.2, -0.6, -0.9, -0.2, 0.5, 0.9, 0.3, -0.5, -0.3];
const DUNE_B = [-0.4, 0.3, 0.8, 0.6, -0.1, -0.7, -0.8, -0.1, 0.4];
const DUNE_C = [0.5, 0.7, 0.1, -0.7, -0.6, 0.2, 0.8, 0.5, -0.3];

type Pt = [number, number];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function n(v: number): string {
  return String(Math.round(v * 10) / 10);
}

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return (
    "#" +
    pa
      .map((v, i) =>
        Math.round(v + (pb[i] - v) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Catmull-Rom spline through points, as "M..C.." (cubic segments, so every keyframe has the same structure). */
function smooth(p: Pt[]): string {
  let d = `M${n(p[0][0])} ${n(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(p.length - 1, i + 2)];
    d += `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d;
}

/** Closed sand shape whose dune line sits at `base`; the sides and bottom lie outside the sphere. */
function sandPath(cx: number, base: number, off: number[], amp: number, above = false): string {
  const half = R + 30;
  const step = (2 * half) / (NPTS - 1);
  const pts: Pt[] = off.map((o, i) => [cx - half + i * step, base + amp * o]);
  const edge = above ? 0 : H;
  return `${smooth(pts)}L${n(cx + half)} ${edge}L${n(cx - half)} ${edge}Z`;
}

/** Deterministic pseudo random numbers, so every frame has identical grain textures. */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (Math.imul(t, 1664525) + 1013904223) >>> 0;
    return t / 4294967296;
  };
}

/*
 * Falling sand, drawn in its own coordinate system with the origin at the inlet above the sphere. Everything falls from
 * above the sphere to below its bottom; the opaque sand hides whatever is under its surface, so the stream always ends
 * exactly at the (gliding) surface, without any splash. A haze at the top of the sphere hides the inlet.
 * Gravity: grains leave the inlet at a quarter of their final speed, v(y) = v0 sqrt(1 + 15 y / L), which is
 * s(p) = (p + ACC p^2) / (1 + ACC) over linear time p. Longer timers fall a little slower (flowSpeed).
 * - Core: a dense ribbon of fine specks. A stitched noise tile scrolls inside a filter (feOffset, seamless loop) and is
 *   warped by a fixed displacement map, so the specks speed up and stretch into longer streaks toward the bottom (motion
 *   blur grows with speed). The noise is thresholded against a density field (a near-cylinder plus a faint wedge that
 *   only opens up lower down), so the top stays narrow and clean and the edges thin out into loose specks below.
 * - Loose grains, dust and glints: elements with CSS keyframes (exact quadratic easing per keyframe segment) that leave
 *   the core late along curved paths (offset ~ depth^flare, scaled per grain by --d), more and more toward the surface.
 * - Start/stop: vertical gradients that follow the first or last grains down (SMIL, phase from flowStartMs/flowStopMs)
 *   scale the core's density (a thinner trickle, not just a fade) and mask the grains.
 * Phase: grain delays are their own offset minus a shared clock --n (wall clock modulo a common period of all
 * durations); everything else begins at a time derived from nowMs. Consecutive frames differ only in these phases.
 */
const FALL_TOP = CY - R - 8;
const FALL_LEN = BOTTOM + 8 - FALL_TOP;
const ACC = 1.5;
const FALL_STOPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const fallS = (p: number) => (p + ACC * p * p) / (1 + ACC);
const fallV = (p: number) => (1 + 2 * ACC * p) / (1 + ACC);
/** Full fall time (ms) at speed 1, and the inlet speed (units/s) it implies. */
const FALL_MS = 1060;
const V0 = (FALL_LEN * 1000) / FALL_MS / (1 + ACC);
/**
 * Core noise: tile height (= scroll distance per loop). The noise scrolls at the bottom speed and the warp compresses it
 * toward the inlet (u' = v_bottom / v >= 1). Compressing rather than stretching matters: the 8-bit map moves in steps of
 * WARP / 255, and a step that stretches repeats a slice of specks (a visible ladder), while one that compresses only
 * skips a fraction of a unit.
 */
const WARP_RATIO = 1 + 2 * ACC;
const NOISE_P = 512;
const WARP_K = WARP_RATIO ** 2 - 1;
const warpSrc = (y: number) => ((2 * WARP_RATIO * FALL_LEN) / WARP_K) * (Math.sqrt(1 + (WARP_K * y) / FALL_LEN) - 1);
const WARP = warpSrc(FALL_LEN) - FALL_LEN;
/** Core density shape: half-widths at the inlet and at the surface, and edge softness. */
const CORE_H0 = 4;
const CORE_H1 = 8;
const CORE_SOFT = 2.2;
/**
 * Scatter: depth below the inlet at which the faint dispersion wedge reaches its half-width SCATTER_W and loose grains
 * their full drift. It is fixed (not the current surface) so that a re-render never moves a grain sideways.
 */
const SCATTER_REF = 210;
const SCATTER_W = 20;
/** Sideways drift of loose grains at depth y (1 at SCATTER_REF, then growing gently). */
const scatterAt = (y: number, flare: number) =>
  y <= SCATTER_REF ? Math.pow(y / SCATTER_REF, flare) : 1 + (0.8 * (y - SCATTER_REF)) / SCATTER_REF;
/** Start: the flow thickens from a trickle over FLOW_IN_MS; stop: the emission thins out over FLOW_OUT_MS. */
const FLOW_IN_MS = 1200;
const FLOW_OUT_MS = 350;
const TRICKLE = 0.3;
/** Haze strength while the sand is not flowing (1 = flowing). */
const HAZE_IDLE = 0.7;
/** Overall strength of the top haze in dark mode (light mode uses 0.95). */
const HAZE_DARK = 0.78;

function r3(v: number): string {
  return String(Math.round(v * 1000) / 1000).replace(/^(-?)0\./, "$1.");
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

/** The fall as one exact SMIL spline: s(p) = c1 p + (1 - c1) p^2 with c1 = 1 / (1 + ACC). */
const FALL_SPLINE = `.333 ${r3(1 / (1 + ACC) / 3)} .667 ${r3((1 + 1 / (1 + ACC)) / 3)}`;

/** Sand speed for a timer: 1 up to 2 min, easing on a log scale to 0.63 at 60 min and longer. */
function flowSpeed(totalMs: number): number {
  return 1 - 0.37 * clamp01(Math.log(Math.max(1, totalMs / 120000)) / Math.log(30));
}

/** How long a start or stop transition lasts (ms): the emission ramp plus a full fall. */
function flowTransitionMs(speed: number): number {
  return FLOW_IN_MS + FALL_MS / speed + 100;
}

function toBase64(bytes: number[]): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  return btoa(String.fromCharCode(...bytes));
}

let warpMapUri = "";
/**
 * The core's displacement map as a 1-pixel-wide PNG (red = vertical shift, green = 0.5 = no sideways shift). An SVG
 * gradient would be dithered by Chromium, which turns the warped specks into jagged dotted lines.
 */
function warpMap(): string {
  if (warpMapUri) return warpMapUri;
  const rows = 64;
  const raw: number[] = [];
  for (let i = 0; i < rows; i++) {
    const y = ((i + 0.5) / rows) * FALL_LEN;
    raw.push(0, Math.round((255 * (warpSrc(y) - y)) / WARP), 128, 0);
  }
  const u32 = (v: number) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  const crc = (bytes: number[]) => {
    let c = -1;
    for (const b of bytes) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return (c ^ -1) >>> 0;
  };
  const chunk = (type: string, data: number[]) => {
    const td = [...type].map((ch) => ch.charCodeAt(0)).concat(data);
    return [...u32(data.length), ...td, ...u32(crc(td))];
  };
  let a = 1;
  let b = 0;
  for (const v of raw) {
    a = (a + v) % 65521;
    b = (b + a) % 65521;
  }
  // zlib stream with a single stored (uncompressed) block
  const len = raw.length;
  const zlib = [0x78, 0x01, 1, len & 255, len >>> 8, ~len & 255, (~len >>> 8) & 255, ...raw, ...u32(b * 65536 + a)];
  const png = [
    ...[137, 80, 78, 71, 13, 10, 26, 10],
    ...chunk("IHDR", [...u32(1), ...u32(rows), 8, 2, 0, 0, 0]),
    ...chunk("IDAT", zlib),
    ...chunk("IEND", []),
  ];
  warpMapUri = `data:image/png;base64,${toBase64(png)}`;
  return warpMapUri;
}

/** A start ("in") or stop ("out") transition, `age` ms after flowStartMs / flowStopMs. */
interface FlowPhase {
  kind: "in" | "out";
  age: number;
}

/**
 * The density of a transition along the stream as a vertical gradient in stream coordinates. y2 follows the first grain
 * of the change down, y1 the grain released when the emission ramp ended; both fall like every grain. "in": a trickle
 * (TRICKLE) at the head that thickens to full above; "out": full below, thinning to nothing at the tail.
 */
function flowGradient(id: string, ph: FlowPhase, fallMs: number, anim: boolean): string {
  const ramp = ph.kind === "in" ? FLOW_IN_MS : FLOW_OUT_MS;
  const t = ph.age;
  // y1 ends a little above y2: equal ends would make the gradient degenerate, painted all in its last stop colour
  const L = FALL_LEN;
  const L1 = L - 2;
  const at = (dt: number, to: number) => (dt <= 0 ? 0 : dt >= fallMs ? to : fallS(dt / fallMs) * to);
  const e = Math.min(1, t / ramp);
  const [a0, a1] = ph.kind === "in" ? [TRICKLE, 1] : [1, 0];
  const begin = `-${(t / 1000).toFixed(3)}s`;
  const y1 = anim
    ? `<animate attributeName="y1" values="0;0;${L1}" keyTimes="0;${r3(ramp / (ramp + fallMs))};1" calcMode="spline" keySplines="0 0 1 1;${FALL_SPLINE}" dur="${(ramp + fallMs) / 1000}s" begin="${begin}" fill="freeze"/>`
    : "";
  const y2 = anim
    ? `<animate attributeName="y2" values="0;${L}" calcMode="spline" keySplines="${FALL_SPLINE}" dur="${fallMs / 1000}s" begin="${begin}" fill="freeze"/>`
    : "";
  const top = anim
    ? `<animate attributeName="stop-opacity" values="${a0};${a1}" dur="${ramp / 1000}s" begin="${begin}" fill="freeze"/>`
    : "";
  const stops =
    ph.kind === "in"
      ? `<stop offset="0" stop-color="#fff" stop-opacity="${r3(a0 + (a1 - a0) * e)}">${top}</stop><stop offset=".88" stop-color="#fff" stop-opacity="${TRICKLE}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>`
      : `<stop offset="0" stop-color="#fff" stop-opacity="${r3(a0 + (a1 - a0) * e)}">${top}</stop><stop offset="1" stop-color="#fff"/>`;
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${n(at(t - ramp, L1))}" y2="${n(at(t, L))}">${y1}${y2}${stops}</linearGradient>`;
}

interface Specks {
  /** Noise channel: alpha or red, two independent fields of the same noise. */
  ch: "A" | "R";
  /** Specks where noise + bias * density > thr + bias (gain = edge sharpness); a larger bias keeps them nearer the middle. */
  thr: number;
  bias: number;
  gain: number;
  color: string;
}

/**
 * The core ribbon: one noise pipeline (scroll + warp), thresholded into two sets of specks. The noise tile sits at the
 * origin of the filter's space, else Chromium shows the stitch. `wrap` applies transition masks to the density field.
 */
function sandCore(
  specks: Specks[],
  speed: number,
  now: number,
  anim: boolean,
  visLen: number,
  wrap: (s: string) => string,
): { defs: string; body: string } {
  const L = FALL_LEN;
  const refLen = SCATTER_REF;
  const wedgeEnd = SCATTER_W + ((SCATTER_W - CORE_H0) * (L - refLen)) / refLen;
  const w = 2 * Math.ceil(Math.max(wedgeEnd, SCATTER_W) + 3 * CORE_SOFT + 2);
  // The warp reads the scrolled noise at warpSrc(y) - WARP / 2, and the scroll reads the tiled noise up to NOISE_P above
  const top = Math.floor(-WARP / 2 - NOISE_P - 2);
  const bottom = Math.ceil(Math.max(warpSrc(visLen) - WARP / 2, visLen, NOISE_P) + 2);
  const noiseMs = Math.round((NOISE_P / (V0 * WARP_RATIO * speed)) * 1000);
  const phase = (((now % noiseMs) + noiseMs) % noiseMs) / noiseMs;
  const scroll = anim
    ? `<animate attributeName="dy" from="0" to="${NOISE_P}" dur="${noiseMs / 1000}s" begin="-${((phase * noiseMs) / 1000).toFixed(3)}s" repeatCount="indefinite"/>`
    : "";
  // Slower sand: shorter specks (less motion blur), same coverage
  const fy = r3(0.08 / speed);
  let defs =
    `<filter id="sc" filterUnits="userSpaceOnUse" x="0" y="${top}" width="${w}" height="${bottom - top}" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceAlpha" stdDeviation="${CORE_SOFT}" result="den"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="1.1 ${fy}" numOctaves="2" seed="5" stitchTiles="stitch" x="0" y="0" width="${w}" height="${NOISE_P}"/>` +
    `<feTile x="0" y="${top}" width="${w}" height="${bottom - top}"/>` +
    `<feOffset dy="${anim ? 0 : n(phase * NOISE_P)}" result="sn">${scroll}</feOffset>` +
    `<feImage href="${warpMap()}" x="0" y="0" width="${w}" height="${L}" preserveAspectRatio="none" result="map"/>` +
    `<feDisplacementMap in="sn" in2="map" scale="${n(WARP)}" xChannelSelector="G" yChannelSelector="R" y="0" height="${n(visLen)}" result="nz"/>`;
  specks.forEach((k, i) => {
    let src = "nz";
    if (k.ch === "R") {
      src = `r${i}`;
      defs += `<feColorMatrix in="nz" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="${src}"/>`;
    }
    defs +=
      `<feComposite in="${src}" in2="den" operator="arithmetic" k2="${k.gain}" k3="${r3(k.gain * k.bias)}" k4="${r3(-k.gain * (k.thr + k.bias))}" result="a${i}"/>` +
      `<feFlood flood-color="${k.color}"/><feComposite in2="a${i}" operator="in" result="s${i}"/>`;
  });
  defs += `<feMerge>${specks.map((_, i) => `<feMergeNode in="s${i}"/>`).join("")}</feMerge></filter>`;
  // Density: zero inside the haze at the inlet, densest just below it (narrow, slow grains are packed closest), then
  // easing off; the wedge adds a faint halo that opens up from a third of the way down.
  const f = (y: number) => r3(y / L);
  const wy = refLen * 0.35;
  defs +=
    `<linearGradient id="sd1" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${L}"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${f(10)}" stop-color="#fff" stop-opacity="0"/><stop offset="${f(48)}" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient>` +
    `<linearGradient id="sd2" gradientUnits="userSpaceOnUse" x1="0" y1="${n(wy)}" x2="0" y2="${n(refLen)}"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></linearGradient>`;
  const m = w / 2;
  const hw = (y: number) => CORE_H0 + ((CORE_H1 - CORE_H0) * y) / refLen;
  const cyl = `M${n(m - CORE_H0)} 0H${n(m + CORE_H0)}L${n(m + hw(L))} ${L}H${n(m - hw(L))}Z`;
  const wedge = `M${n(m - hw(wy))} ${n(wy)}H${n(m + hw(wy))}L${n(m + SCATTER_W)} ${n(refLen)}L${n(m + wedgeEnd)} ${L}H${n(m - wedgeEnd)}L${n(m - SCATTER_W)} ${n(refLen)}Z`;
  const body = `<g transform="translate(${-m} 0)" filter="url(#sc)">${wrap(`<path d="${cyl}" fill="url(#sd1)"/><path d="${wedge}" fill="url(#sd2)"/>`)}</g>`;
  return { defs, body };
}

interface GrainKind {
  /** CSS class (also the keyframes name with an "f" prefix). */
  cls: string;
  /** Streak width. */
  w: number;
  /** Exposure in seconds: streak length = speed * tau (at least minLen). */
  tau: number;
  minLen: number;
  /** Sideways drift grows like (depth / SCATTER_REF)^flare: the larger, the later grains leave the core. */
  flare: number;
  /** Fall durations at speed 1, in steps of 40 ms (grains are spread over them). */
  steps: number[];
  /** [colour, opacity] per group. */
  tints: Array<[string, number]>;
  count: number;
  /** Sway layer (0 dust, 1 loose grains). */
  layer: number;
  /** Returns [inlet x, sideways drift at the surface]. */
  place: (rand: () => number) => [number, number];
}

/** Grain keyframes: exact fall, motion-blur streak, sideways drift and a fade-in inside the haze. */
function fallKeyframes(k: GrainKind, unit: number): string {
  const refT = (k.steps.reduce((a, b) => a + b, 0) / k.steps.length) * (unit / 1000);
  const len = (p: number) => Math.max(k.minLen, (FALL_LEN / refT) * fallV(p) * k.tau);
  const fade = ["opacity:0", "opacity:.2", "opacity:1"];
  const frames = FALL_STOPS.map((p, i) => {
    const q = FALL_STOPS[i + 1];
    let tf = "";
    if (q !== undefined) {
      const c1 = (fallV(p) * (q - p)) / (fallS(q) - fallS(p));
      tf = `;animation-timing-function:cubic-bezier(.333,${r3(c1 / 3)},.667,${r3((1 + c1) / 3)})`;
    }
    const x = scatterAt(fallS(p) * FALL_LEN, k.flare);
    const op = fade[i] ? `;${fade[i]}` : "";
    return `${Math.round(p * 100)}%{transform:translate(calc(var(--d)*${r3(x)}px),${n(fallS(p) * FALL_LEN)}px) scale(1,${n(len(p))})${op}${tf}}`;
  });
  return `@keyframes f${k.cls}{${frames.join("")}}`;
}

/**
 * The stream of falling sand. `base` is the current sand level, `speed` the fall speed factor and `phases` the active
 * start/stop transitions: each inner list is one mask (their union), several masks intersect.
 */
function sandStream(
  cx: number,
  base: number,
  dark: boolean,
  now: number,
  anim: boolean,
  speed: number,
  phases: FlowPhase[][],
): { defs: string; body: string } {
  const gauss = (rand: () => number) => (rand() + rand() + rand() - 1.5) / 1.5;
  const side = (rand: () => number) => (rand() < 0.5 ? -1 : 1);
  const L = FALL_LEN;
  const visLen = Math.min(L, base + 14 - FALL_TOP);
  const kinds: GrainKind[] = [
    {
      cls: "u",
      w: 0.6,
      tau: 0.012,
      minLen: 0.7,
      flare: 2.6,
      steps: [33, 36],
      tints: dark ? [["#FFD39C", 0.45]] : [["#B98250", 0.45]],
      count: 56,
      layer: 0,
      place: (rand) => [gauss(rand) * 0.6 * CORE_H0, side(rand) * (8 + 22 * rand())],
    },
    {
      cls: "s",
      w: 0.75,
      tau: 0.014,
      minLen: 1,
      flare: 2.8,
      steps: [24, 26, 28, 30],
      tints: dark
        ? [
            ["#FFDCA6", 0.85],
            ["#F2B070", 0.75],
          ]
        : [
            ["#A8703F", 0.85],
            ["#C99558", 0.8],
          ],
      count: 100,
      layer: 1,
      place: (rand) => {
        const s = side(rand);
        return [s * CORE_H0 * (0.1 + 0.7 * rand()), s * (3 + 18 * Math.pow(rand(), 1.4))];
      },
    },
    {
      cls: "g",
      w: 1,
      tau: 0.008,
      minLen: 1,
      flare: 1.5,
      steps: [25, 27],
      tints: dark ? [["#FFFFFF", 1]] : [["#FFF8EC", 1]],
      count: 14,
      layer: 1,
      place: (rand) => {
        const x = gauss(rand) * 0.7 * CORE_H0;
        return [x, x * 1.2 + side(rand) * 5 * rand()];
      },
    },
  ];
  // Every duration is a whole number of `unit` ms, so their common period (the --n clock) stays exact at any speed
  const unit = Math.round(40 / speed);
  const TWINKLE = 15;
  const period = kinds
    .flatMap((k) => k.steps)
    .concat(TWINKLE)
    .map((s) => s * unit)
    .reduce((a, b) => (a * b) / gcd(a, b));
  const clock = (((now % period) + period) % period) / 1000;

  let css = "";
  const layers = ["", ""];
  kinds.forEach((k, ki) => {
    const rand = rng(101 + ki * 977);
    const groups = k.steps.flatMap((s) => k.tints.map(([c, op]) => ({ t: s * unit, c, op, svg: "" })));
    for (let i = 0; i < k.count; i++) {
      const [x0, d] = k.place(rand);
      const g = groups[Math.floor(rand() * groups.length)];
      const o = rand() * (g.t / 1000);
      if (anim) {
        g.svg += `<rect class="${k.cls}" x="${n(x0 - k.w / 2)}" style="--d:${n(d)};--o:${r3(o)}"/>`;
      } else {
        const T = g.t / 1000;
        const p = ((((clock - o) % T) + T) % T) / T;
        const len = Math.max(k.minLen, (L / T) * fallV(p) * k.tau);
        const x = d * scatterAt(fallS(p) * L, k.flare);
        const op = ` opacity="${r3(Math.min(1, (fallS(p) * L) / 36))}"`;
        g.svg += `<rect class="${k.cls}" x="${n(x0 - k.w / 2)}" transform="translate(${n(x)} ${n(fallS(p) * L)}) scale(1 ${n(len)})"${op}/>`;
      }
    }
    layers[k.layer] += groups
      .map((g) => `<g fill="url(#k${g.c.slice(1)})" opacity="${g.op}" style="--t:${g.t / 1000}">${g.svg}</g>`)
      .join("");
    css += `.${k.cls}{y:-.5px;width:${k.w}px;height:1px}`;
    if (anim) css += fallKeyframes(k, unit);
  });

  // Soft streak gradients (transparent ends = motion blur of a round grain)
  const tints = new Set(kinds.flatMap((k) => k.tints.map(([c]) => c)));
  let defs = [...tints]
    .map(
      (c) =>
        `<linearGradient id="k${c.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".4" stop-color="${c}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`,
    )
    .join("");
  // Soft glow along the core and a dust haze that grows toward the bottom (gradients: far cheaper than blur filters)
  const glowC = dark ? "#FFC98B" : "#D2A064";
  const hazeC = dark ? "#FFB46A" : "#D9A877";
  defs += `<radialGradient id="sg1"><stop offset="0" stop-color="${glowC}"/><stop offset=".55" stop-color="${glowC}" stop-opacity=".55"/><stop offset="1" stop-color="${glowC}" stop-opacity="0"/></radialGradient>`;
  defs += `<radialGradient id="sg2"><stop offset="0" stop-color="${hazeC}"/><stop offset=".45" stop-color="${hazeC}" stop-opacity=".5"/><stop offset="1" stop-color="${hazeC}" stop-opacity="0"/></radialGradient>`;
  if (anim) {
    css +=
      `#st rect{animation-duration:calc(var(--t)*1s);animation-timing-function:linear;animation-iteration-count:infinite;animation-delay:calc(var(--o)*1s - var(--n)*1s)}` +
      kinds.map((k) => `.${k.cls}{animation-name:f${k.cls}}`).join("") +
      `#st .g{animation-name:fg,tw;animation-duration:calc(var(--t)*1s),${(TWINKLE * unit) / 1000}s}` +
      `@keyframes tw{0%,55%,100%{fill-opacity:.15}75%{fill-opacity:1}}` +
      `@keyframes sw{0%,100%{transform:skewX(calc(var(--a)*-1deg))}50%{transform:skewX(calc(var(--a)*1deg))}}` +
      `.w{animation:sw 7s ease-in-out infinite}`;
  }
  defs += `<style>${css}</style>`;

  // Start/stop masks
  const fallMs = FALL_MS / speed;
  const masks = phases.map((union, i) => {
    const rects = union
      .map((ph, j) => {
        defs += flowGradient(`fg${i}${j}`, ph, fallMs, anim);
        return `<rect x="-100" y="-10" width="200" height="${L + 20}" fill="url(#fg${i}${j})"/>`;
      })
      .join("");
    defs += `<mask id="fm${i}" maskUnits="userSpaceOnUse" x="-100" y="-10" width="200" height="${L + 20}">${rects}</mask>`;
    return `fm${i}`;
  });
  const wrap = (s: string) => masks.reduce((c, id) => `<g mask="url(#${id})">${c}</g>`, s);

  // Core ribbon: wide amber specks and, nearer the middle, bright ones (two channels of the same noise)
  const core = sandCore(
    [
      { ch: "R", thr: 0.36, bias: 0.5, gain: 4, color: dark ? "#EFA35E" : "#D3A062" },
      { ch: "A", thr: 0.42, bias: 0.5, gain: 3.5, color: dark ? "#FFE2B0" : "#AE763F" },
    ],
    speed,
    now,
    anim,
    visLen,
    wrap,
  );
  defs += core.defs;

  const sway = (a: number, ms: number) =>
    anim
      ? ` class="w" style="--a:${a};animation-duration:${ms / 1000}s;animation-delay:-${((now % ms) / 1000).toFixed(3)}s"`
      : "";
  let body = `<g id="st" transform="translate(${cx} ${FALL_TOP})" style="--n:${clock.toFixed(3)}">`;
  // Dust haze near the surface, the core with its glow, then the loose grains. Layers sway a little differently.
  const r = SCATTER_REF;
  body += `<g${sway(1, 9700)}>${wrap(`<g fill="url(#sg2)" opacity="${dark ? 0.3 : 0.24}"><ellipse cy="${n(r * 1.05)}" rx="40" ry="${n(r * 0.6)}"/><ellipse cy="${n(r * 0.8)}" rx="15" ry="${n(r * 0.5)}"/></g>${layers[0]}`)}</g>`;
  body += `<g${sway(0.5, 7300)}>${wrap(`<ellipse cy="${n(r * 0.75)}" rx="9" ry="${n(r * 0.72)}" fill="url(#sg1)" opacity="${dark ? 0.55 : 0.32}"/>`)}${core.body}</g>`;
  body += `<g${sway(0.7, 5100)}>${wrap(layers[1])}</g>`;
  body += `</g>`;
  return { defs, body };
}

/**
 * A soft, washed-out mist at the top of the sphere that the sand pours out of (like the neck of an hourglass). Always
 * there, a little stronger while the sand flows; `k0` -> `k1` over `dur` ms, `age` ms in, for start/stop transitions.
 */
function topHaze(
  cx: number,
  dark: boolean,
  now: number,
  anim: boolean,
  k0: number,
  k1: number,
  age: number,
  dur: number,
): { defs: string; body: string } {
  const c = dark ? "#EBD0AE" : "#E9D3B8";
  const defs = `<radialGradient id="th"><stop offset="0" stop-color="${c}"/><stop offset=".5" stop-color="${c}" stop-opacity=".5"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const top = CY - R;
  // [dx, dy from the sphere top, rx, ry, opacity, drift, drift period ms]
  const lobes: Array<[number, number, number, number, number, number, number]> = [
    [0, 8, 124, 40, 0.7, 0, 0],
    [-30, 14, 60, 26, 0.5, 6, 17000],
    [32, 14, 56, 24, 0.35, -5, 13000],
    [0, 22, 30, 26, 0.75, 3, 11000],
  ];
  const k = dur > 0 ? k0 + (k1 - k0) * Math.min(1, age / dur) : k1;
  let body = `<g fill="url(#th)" opacity="${r3(k * (dark ? HAZE_DARK : 0.95))}">`;
  if (anim && dur > 0 && age < dur) {
    const s = dark ? HAZE_DARK : 0.95;
    body += `<animate attributeName="opacity" values="${r3(k0 * s)};${r3(k1 * s)}" dur="${dur / 1000}s" begin="-${(age / 1000).toFixed(3)}s" fill="freeze"/>`;
  }
  for (const [dx, dy, rx, ry, op, drift, ms] of lobes) {
    body += `<ellipse cx="${cx + dx}" cy="${top + dy}" rx="${rx}" ry="${ry}" opacity="${op}">`;
    if (anim && ms)
      body += `<animateTransform attributeName="transform" type="translate" values="0 0;${drift} 1;0 0" keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" dur="${ms / 1000}s" begin="-${((now % ms) / 1000).toFixed(3)}s" repeatCount="indefinite"/>`;
    body += `</ellipse>`;
  }
  body += `</g>`;
  return { defs, body };
}

function formatClock(ms: number): { text: string; groups: string[]; labels: string[] } {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (v: number) => String(v).padStart(2, "0");
  const groups = h > 0 ? [String(h), p(m), p(s)] : [p(m), p(s)];
  return {
    text: groups.join(":"),
    groups,
    labels: h > 0 ? ["HOURS", "MINS", "SECS"] : ["MINS", "SECS"],
  };
}

export function renderDial(o: DialOptions): string {
  const dark = o.theme === "dark";
  const w = o.wide ? WIDE_W : W;
  const cx = w / 2;
  const now = o.nowMs ?? Date.now();
  const anim = o.animate !== false;
  const { status } = o;
  const finished = status === "finished";
  const paused = status === "paused";
  const running = status === "running";

  const elapsedAt = (remMs: number) => clamp01(o.totalMs > 0 ? 1 - remMs / o.totalMs : 0);
  const levelAt = (e: number) => BOTTOM - (0.1 + 0.78 * e) * 2 * R;
  const elapsed = status === "idle" ? 0 : finished ? 1 : elapsedAt(o.remainingMs);
  const base = levelAt(elapsed);
  // While running the sand glides from level(now) to level(now + 2 s) so the rise is even between 1 s re-renders.
  const glideMs = running && anim ? Math.min(2000, Math.max(0, o.remainingMs)) : 0;
  const glideDy = glideMs > 0 ? levelAt(elapsedAt(o.remainingMs - glideMs)) - base : 0;

  // Sand flow: full while running, with start/stop transitions from flowStartMs / flowStopMs
  const speed = flowSpeed(o.totalMs);
  const trMs = flowTransitionMs(speed);
  const since = (t?: number) => (t === undefined ? Infinity : now - t);
  const startAge = since(o.flowStartMs);
  const stopAge = since(o.flowStopMs);
  const phases: FlowPhase[][] = [];
  let flowing = running;
  let haze = { k0: running ? 1 : HAZE_IDLE, k1: running ? 1 : HAZE_IDLE, age: 0, dur: 0 };
  // Haze level that a start (brightening) or stop (dimming) ramp had reached `dt` ms in
  const hazeIn = (dt: number) => HAZE_IDLE + (1 - HAZE_IDLE) * clamp01(dt / FLOW_IN_MS);
  const hazeOut = (dt: number) => 1 - (1 - HAZE_IDLE) * clamp01(dt / trMs);
  if (running && startAge < trMs) {
    const union: FlowPhase[] = [{ kind: "in", age: Math.max(0, startAge) }];
    let k0 = HAZE_IDLE;
    // Resumed while the last stop was still draining: its tail keeps falling
    if (stopAge < trMs && stopAge >= startAge) {
      union.push({ kind: "out", age: Math.max(0, stopAge) });
      k0 = hazeOut(stopAge - startAge);
    }
    phases.push(union);
    haze = { k0, k1: 1, age: Math.max(0, startAge), dur: FLOW_IN_MS };
  } else if ((paused || finished) && stopAge < trMs) {
    flowing = true;
    phases.push([{ kind: "out", age: Math.max(0, stopAge) }]);
    let k0 = 1;
    // Stopped while the start was still under way: its head keeps falling too
    if (startAge >= stopAge && startAge < stopAge + trMs) {
      phases.push([{ kind: "in", age: Math.max(0, startAge) }]);
      k0 = hazeIn(startAge - stopAge);
    }
    haze = { k0, k1: HAZE_IDLE, age: Math.max(0, stopAge), dur: trMs };
  }

  // Palette
  const bgTop = dark ? "#1B2238" : "#F6EBDD";
  const bgBottom = dark ? "#2E2A4A" : "#EBC9A8";
  let stops = dark
    ? ["#F2CC8E", "#D9A06A", "#9A5F48", "#61364A", "#351425"]
    : ["#EDD3AE", "#D6AC7F", "#AD7653", "#7A463A", "#4E232B"];
  let backSand = dark ? "#C9935F" : "#F1DDBC";
  if (paused) {
    const g = dark ? "#6F6D86" : "#B9AA9E";
    stops = stops.map((c) => mix(c, g, 0.38));
    backSand = mix(backSand, g, 0.38);
  }
  const inkDark = "#4A2C25";
  const inkCream = dark ? "#FFF1DC" : "#FFF4E3";
  const warm = finished ? "#FFB070" : "#FFC98B";

  // Dune geometry: three keyframes at the current level
  const amp = 8;
  const dA = sandPath(cx, base, DUNE_A, amp);
  const dB = sandPath(cx, base, DUNE_B, amp);
  const dC = sandPath(cx, base, DUNE_C, amp);
  const bA = sandPath(cx, base - 13, DUNE_B, amp * 0.8);
  const bB = sandPath(cx, base - 13, DUNE_C, amp * 0.8);
  const bC = sandPath(cx, base - 13, DUNE_A, amp * 0.8);
  const begin = (period: number, off = 0) => `-${(((now + off) % period) / 1000).toFixed(3)}s`;
  const morph = (a: string, b: string, c: string, period: number) =>
    anim
      ? `<animate attributeName="d" values="${a};${b};${c};${a}" keyTimes="0;0.33;0.67;1" calcMode="spline" keySplines="${SPLINE}" dur="${period / 1000}s" begin="${begin(period)}" repeatCount="indefinite"/>`
      : "";

  // Defs
  let defs =
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bgTop}"/><stop offset="1" stop-color="${bgBottom}"/></linearGradient>` +
    `<clipPath id="cc"><rect width="${w}" height="${H}" rx="28"/></clipPath>` +
    `<clipPath id="gc"><circle cx="${cx}" cy="${CY}" r="${R}"/></clipPath>`;
  const span = Math.max(BOTTOM - base, 110);
  defs += `<linearGradient id="sg" gradientUnits="userSpaceOnUse" x1="0" y1="${n(base - amp)}" x2="0" y2="${n(base - amp + span)}">${stops
    .map((c, i) => `<stop offset="${[0, 0.14, 0.4, 0.72, 1][i]}" stop-color="${c}"/>`)
    .join("")}</linearGradient>`;
  defs += dark
    ? `<linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A5580" stop-opacity="0.42"/><stop offset="0.6" stop-color="#252C4C" stop-opacity="0.5"/><stop offset="1" stop-color="#1A1F38" stop-opacity="0.6"/></linearGradient>` +
      `<linearGradient id="rm" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#B9C8FF" stop-opacity="0.6"/><stop offset="0.5" stop-color="#8FA2E0" stop-opacity="0.12"/><stop offset="1" stop-color="#FFB98A" stop-opacity="0.22"/></linearGradient>` +
      `<radialGradient id="sh" cx="0.5" cy="0.46" r="0.5"><stop offset="0.7" stop-color="#0B0E1E" stop-opacity="0"/><stop offset="1" stop-color="#0B0E1E" stop-opacity="0.5"/></radialGradient>` +
      `<radialGradient id="hl"><stop offset="0" stop-color="#CFDAFF" stop-opacity="0.3"/><stop offset="1" stop-color="#CFDAFF" stop-opacity="0"/></radialGradient>` +
      `<filter id="bl" x="-60%" y="-30%" width="220%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>`
    : `<linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.92"/><stop offset="0.5" stop-color="#FFFBF5" stop-opacity="0.5"/><stop offset="1" stop-color="#FFEBD6" stop-opacity="0.3"/></linearGradient>` +
      `<linearGradient id="rm" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.35"/><stop offset="1" stop-color="#C98A62" stop-opacity="0.35"/></linearGradient>` +
      `<radialGradient id="sh" cx="0.5" cy="0.46" r="0.5"><stop offset="0.68" stop-color="#A8704C" stop-opacity="0"/><stop offset="1" stop-color="#8A4B3A" stop-opacity="0.32"/></radialGradient>` +
      `<radialGradient id="hz"><stop offset="0" stop-color="#8A4B3A" stop-opacity="0.3"/><stop offset="1" stop-color="#8A4B3A" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="hl"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.8"/><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0.3"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>`;
  // Glow strength grows with the fill. While running it glides like the sand level (no 1 s steps); when the timer
  // finishes it rises gently to its finished strength instead of jumping.
  const glowMax = dark ? 0.36 : 0.5;
  const glowDone = 0.5;
  const glowNow = finished ? glowDone : glowMax * elapsed;
  const glowNext = glideMs > 0 ? glowMax * elapsedAt(o.remainingMs - glideMs) : glowNow;
  const glowC = dark ? "#FFC98B" : "#FFE2B5";
  defs += `<radialGradient id="gw"><stop offset="0" stop-color="${glowC}"/><stop offset="0.55" stop-color="${glowC}" stop-opacity="0.4"/><stop offset="1" stop-color="${glowC}" stop-opacity="0"/></radialGradient>`;
  defs += `<path id="sd" d="${dA}">${morph(dA, dB, dC, 9000)}</path>`;
  defs += `<path id="bd" d="${bA}">${morph(bA, bB, bC, 12000)}</path>`;

  // Backdrop
  let body = `<g clip-path="url(#cc)"><rect width="${w}" height="${H}" fill="url(#bg)"/>`;
  if (dark) {
    const stars: Array<[number, number, number, number]> = [
      [-300, 44, 1.2, 0.35],
      [-262, 110, 0.9, 0.22],
      [-215, 62, 1.1, 0.3],
      [-318, 176, 0.8, 0.2],
      [-236, 220, 1, 0.18],
      [196, 38, 1, 0.3],
      [246, 96, 1.3, 0.35],
      [300, 52, 0.9, 0.22],
      [214, 168, 0.8, 0.2],
      [310, 150, 1.1, 0.28],
      ...(o.wide
        ? ([
            [-440, 70, 1, 0.28],
            [-392, 140, 0.9, 0.2],
            [420, 46, 1.1, 0.3],
            [462, 164, 1, 0.26],
          ] as Array<[number, number, number, number]>)
        : []),
    ];
    body += stars
      .map(([dx, y, r, op]) => `<circle cx="${cx + dx}" cy="${y}" r="${r}" fill="#DCE4FF" opacity="${op}"/>`)
      .join("");
  }
  // Sunset-style glow behind the distant dunes; grows with the fill (off at the start)
  if (glowNow > 0.005 || glowNext > 0.005) {
    const rx = o.wide ? 430 : 340;
    const riseMs = 2500;
    let strength = "";
    if (anim && glideMs > 0) {
      strength = `<animate attributeName="opacity" from="${r3(glowNow)}" to="${r3(glowNext)}" dur="${glideMs / 1000}s" begin="0s" fill="freeze"/>`;
    } else if (anim && finished && stopAge < riseMs) {
      strength = `<animate attributeName="opacity" from="${r3(glowMax)}" to="${r3(glowDone)}" dur="${riseMs / 1000}s" begin="-${(stopAge / 1000).toFixed(3)}s" fill="freeze"/>`;
    }
    // Two soft lobes: the main one breathes slowly, a smaller one drifts from side to side, so the light flows.
    const breathe = anim
      ? `<animate attributeName="rx" values="${rx};${n(rx * 1.07)};${rx}" keyTimes="0;.5;1" calcMode="spline" keySplines="${SPLINE2}" dur="9s" begin="${begin(9000)}" repeatCount="indefinite"/>` +
        `<animate attributeName="ry" values="125;136;125" keyTimes="0;.5;1" calcMode="spline" keySplines="${SPLINE2}" dur="9s" begin="${begin(9000)}" repeatCount="indefinite"/>`
      : "";
    const drift = anim
      ? `<animateTransform attributeName="transform" type="translate" values="-46 0;46 0;-46 0" keyTimes="0;.5;1" calcMode="spline" keySplines="${SPLINE2}" dur="15s" begin="${begin(15000)}" repeatCount="indefinite"/>`
      : "";
    body += `<g opacity="${r3(glowNow)}">${strength}`;
    body += `<ellipse cx="${cx}" cy="388" rx="${rx}" ry="125" fill="url(#gw)">${breathe}</ellipse>`;
    body += `<ellipse cx="${cx}" cy="394" rx="${n(rx * 0.5)}" ry="92" fill="url(#gw)" opacity="0.5">${drift}</ellipse>`;
    body += `</g>`;
  }
  // Distant dunes (very quiet)
  const dunes: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * w;
    const r = Math.abs(x - cx) / (w / 2);
    dunes.push([x, 400 - 62 * Math.pow(r, 1.2) + 7 * Math.sin(i * 1.7)]);
  }
  body += `<path d="${smooth(dunes)}L${w} ${H}L0 ${H}Z" fill="${dark ? "#141A2E" : "#DDAE88"}" opacity="${dark ? 0.82 : 0.4}"/>`;
  if (!dark) body += `<ellipse cx="${cx}" cy="${BOTTOM + 6}" rx="165" ry="14" fill="url(#hz)"/>`;

  // Text layout
  const showText = o.showDigits !== false;
  let tx = "";
  if (showText) {
    const clock = formatClock(status === "idle" ? o.totalMs : finished ? 0 : o.remainingMs);
    const three = clock.groups.length === 3;
    const size = three ? 60 : 80;
    const dp = three ? 42 : 56;
    const cp = three ? 20 : 26;
    const chars = clock.text.split("");
    const total = chars.reduce((a, c) => a + (c === ":" ? cp : dp), 0);
    let x = cx - total / 2;
    const xs: number[] = [];
    for (const c of chars) {
      const pw = c === ":" ? cp : dp;
      xs.push(x + pw / 2);
      x += pw;
    }
    const gc: number[] = [];
    let ci = 0;
    for (const g of clock.groups) {
      gc.push((xs[ci] + xs[ci + g.length - 1]) / 2);
      ci += g.length + 1;
    }
    const baseline = CY + size * 0.36;
    const wt = dark ? 200 : 300;
    const digitsTop = baseline - size * 0.72;
    const unitsY = baseline + 26;
    const labelY = digitsTop - 18;
    // Light theme: dark ink until the dune is well above the element's top, then cream (per element).
    const sub = (top: number) => (dark ? "" : ` fill="${base + amp + 24 < top ? inkCream : inkDark}"`);

    tx = `<g id="tx" text-anchor="middle" font-family="${FONT}"><text x="${xs.map(n).join(" ")}" y="${n(baseline)}" font-size="${size}" font-weight="${wt}" ${sub(digitsTop)}>${clock.text}</text>`;
    clock.labels.forEach((l, i) => {
      tx += `<text x="${n(gc[i] + 1.5)}" y="${n(unitsY)}" font-size="11" font-weight="500" letter-spacing="3" opacity="0.8" ${sub(unitsY - 9)}>${l}</text>`;
    });
    if (o.label) {
      tx += `<text x="${cx + 1.5}" y="${n(labelY)}" font-size="14" font-weight="400" letter-spacing="3" opacity="0.75" ${sub(labelY - 11)}>${esc(o.label)}</text>`;
    }
    tx += `</g>`;
  }

  // Sphere
  body += `<circle cx="${cx}" cy="${CY}" r="${R}" fill="url(#gs)"/>`;
  body += `<g clip-path="url(#gc)">`;
  // Sand-relative layers glide with the level; the stream sits between the back and the front sand (behind the digits)
  const glide =
    glideDy !== 0
      ? `<animateTransform attributeName="transform" type="translate" from="0 0" to="0 ${n(glideDy)}" dur="${glideMs / 1000}s" begin="0s" fill="freeze"/>`
      : "";
  body += `<g>${glide}<use href="#bd" fill="${backSand}" opacity="${dark ? 0.45 : 0.9}"/></g>`;
  if (flowing) {
    const stream = sandStream(cx, base, dark, now, anim, speed, phases);
    defs += stream.defs;
    body += stream.body;
  }
  const mist = topHaze(cx, dark, now, anim, haze.k0, haze.k1, haze.age, haze.dur);
  defs += mist.defs;
  body += mist.body;
  body += `<g>${glide}<use href="#sd" fill="url(#sg)"/>`;
  if (dark) {
    body += `<use href="#sd" fill="none" stroke="${warm}" stroke-width="6" filter="url(#bl)" opacity="${paused ? 0.25 : finished ? 0.95 : 0.6}"/>`;
  }
  body += `<use href="#sd" fill="none" stroke="${dark ? "#FFE2B8" : "#FFF6E4"}" stroke-width="1.4" opacity="${paused ? 0.5 : 0.8}"/></g>`;
  body += `<circle cx="${cx}" cy="${CY}" r="${R}" fill="url(#sh)"/>`;
  // Glass highlight
  body += `<g transform="rotate(-28 ${cx - 60} ${CY - 112})"><ellipse cx="${cx - 60}" cy="${CY - 112}" rx="100" ry="46" fill="url(#hl)">`;
  if (anim)
    body += `<animate attributeName="opacity" values="0.8;1;0.8" dur="9s" begin="${begin(9000)}" repeatCount="indefinite"/>`;
  body += `</ellipse></g></g>`;
  body += `<circle cx="${cx}" cy="${CY}" r="${R - 0.75}" fill="none" stroke="url(#rm)" stroke-width="1.5"/>`;
  body += `<circle cx="${cx}" cy="${CY}" r="${R + 0.5}" fill="none" stroke="${dark ? "#0B0E1E" : "#8A4B3A"}" stroke-opacity="${dark ? 0.35 : 0.1}"/>`;

  // Text
  if (showText) {
    if (dark) {
      defs += `<filter id="tb" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>`;
      defs += tx;
      body += `<use href="#tx" fill="#1A1228" opacity="0.6" filter="url(#tb)"/><use href="#tx" fill="${inkCream}"/>`;
    } else body += tx;

    const caption = o.caption ?? (paused ? "Paused" : finished ? "Time's up" : undefined);
    if (caption) {
      body += `<text x="${cx}" y="${BOTTOM + 42}" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="400" letter-spacing="0.6" fill="${dark ? "#E4DAF2" : "#4A2C25"}" opacity="${dark ? 0.78 : 0.75}">${esc(caption)}</text>`;
    }
  }
  body += "</g>";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}"><defs>${defs}</defs>${body}</svg>`;
}

export function renderMiniDial(fraction: number, theme: Theme): string {
  const dark = theme === "dark";
  const f = 0.1 + 0.8 * clamp01(fraction);
  const b = 57 - f * 50;
  const sand = `M0 ${n(b)}C16 ${n(b - 3.5)} 26 ${n(b + 3.5)} 38 ${n(b)}S54 ${n(b - 2.5)} 64 ${n(b - 1)}V64H0Z`;
  const stops = dark ? ["#F2CC8E", "#B8794F", "#5A2A3C"] : ["#EDD3AE", "#C28C62", "#5E2E32"];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>` +
    `<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark ? "#1B2238" : "#F6EBDD"}"/><stop offset="1" stop-color="${dark ? "#2E2A4A" : "#EBC9A8"}"/></linearGradient>` +
    `<linearGradient id="s" gradientUnits="userSpaceOnUse" x1="0" y1="${n(b - 3)}" x2="0" y2="57">${stops.map((c, i) => `<stop offset="${i / 2}" stop-color="${c}"/>`).join("")}</linearGradient>` +
    `<clipPath id="c"><circle cx="32" cy="32" r="25"/></clipPath></defs>` +
    `<rect width="64" height="64" rx="14" fill="url(#b)"/>` +
    `<circle cx="32" cy="32" r="25" fill="${dark ? "#39426A" : "#FFFFFF"}" fill-opacity="${dark ? 0.55 : 0.7}"/>` +
    `<g clip-path="url(#c)"><path d="${sand}" fill="url(#s)"/><path d="M0 ${n(b)}C16 ${n(b - 3.5)} 26 ${n(b + 3.5)} 38 ${n(b)}S54 ${n(b - 2.5)} 64 ${n(b - 1)}" fill="none" stroke="${dark ? "#FFE2B8" : "#FFF6E4"}" stroke-width="1.4"/></g>` +
    `<circle cx="32" cy="32" r="24.6" fill="none" stroke="${dark ? "#9FB0EE" : "#FFFFFF"}" stroke-opacity="${dark ? 0.55 : 0.9}" stroke-width="1.6"/>` +
    `</svg>`
  );
}

export function svgToDataUri(svg: string): string {
  if (typeof Buffer !== "undefined") return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  const bytes = new TextEncoder().encode(svg);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}
