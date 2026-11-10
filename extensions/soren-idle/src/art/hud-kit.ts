import { BLUE, circle, line, P, path, poly, Pt } from "./hud";
import { callout } from "./hud-scenes";
import { hash } from "./util";

export const rad = (deg: number) => (deg * Math.PI) / 180;
/** A gentle wobble that differs per phase, for animating things on the four frames. */
export const wave = (f: number, i = 0) => Math.sin(rad(f * 90 + i * 50));

/** Draws `inner` (written around the origin) at a place, size and angle. */
export const at = (x: number, y: number, s: number, deg: number, inner: string) =>
  `<g transform="translate(${x} ${y}) rotate(${deg}) scale(${s})">${inner}</g>`;

export type Scene = (f: number) => string;

/** A subject with a callout naming it, the way every task card is composed. */
export function card(subject: string, label: string, focus: Pt, f: number, r = 70, tag: Pt = [430, 322]): string {
  return subject + callout([focus[0] + r * 0.7, focus[1] + r * 0.5], tag, label);
}

export const glow = (c: Pt, r: number, o = 0.4) => circle(c, r, BLUE.pale, 0, "url(#flare)", `opacity="${o}"`);

/** A little burst of sparks around a point. */
export function sparks(c: Pt, r: number, f: number, n = 6, seed = 1): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const a = rad(i * (360 / n) + f * 23 + hash(i, seed) * 40);
    const d = r * (0.6 + 0.4 * hash(i, f, seed));
    out += line(
      [c[0] + Math.cos(a) * d * 0.6, c[1] + Math.sin(a) * d * 0.6],
      [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d],
      "#ffffff",
      1.4,
    );
  }
  return out;
}

/** A lightning bolt from `a` down to `b`, kinked, in the colours of the screen. */
export function bolt(a: Pt, b: Pt, f: number, kinks = 4, seed = 3): string {
  const pts: Pt[] = [a];
  for (let i = 1; i < kinks; i++) {
    const t = i / kinks;
    pts.push([a[0] + (b[0] - a[0]) * t + (hash(i, f, seed) - 0.5) * 36, a[1] + (b[1] - a[1]) * t]);
  }
  pts.push(b);
  return path(`M${pts.map(P).join("L")}`, "#ffffff", 1.8);
}

/** Closed polygon from a half-profile mirrored about the vertical axis. */
export function mirrored(half: Pt[]): Pt[] {
  return [...half, ...[...half].reverse().map(([x, y]): Pt => [-x, y])];
}

export const hullPoly = (pts: Pt[], stroke: string = BLUE.pale, w = 1.5) => poly(pts, "url(#hull)", stroke, w);

/** A tiny stack of dashes for text-like greebles. */
export function greeble(x: number, y: number, rows: number, f: number, seed = 1): string {
  let out = "";
  for (let r = 0; r < rows; r++) {
    const w = 18 + hash(r, seed) * 40;
    out += line([x, y + r * 8], [x + w, y + r * 8], BLUE.mid, 2, `opacity="${r === f % rows ? 0.95 : 0.45}"`);
  }
  return out;
}
