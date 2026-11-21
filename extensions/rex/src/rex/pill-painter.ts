/**
 * Draws Rex's tab "pills": a rounded card in the program's colours with its glyph, a top gloss,
 * an inner highlight, and a dark edge, optionally fanned into a stack for tabs with several panes.
 *
 * Pure pixel code with no Raycast dependency so it can be exercised outside the extension.
 */
import type { GlyphDefinition, IconGradient } from "./glyph-catalog";

export interface GlyphMask {
  width: number;
  height: number;
  /** Alpha channel, row-major. */
  alpha: Uint8Array;
  /** Bounding box of the opaque pixels. */
  box: { x0: number; y0: number; x1: number; y1: number };
}

export interface BadgeImage {
  width: number;
  height: number;
  /** Straight-alpha RGBA pixels. */
  rgba: Uint8Array;
}

/** What to draw on the front pill to show program activity. */
export type PaintIndicator =
  | { kind: "dot"; color: string } // Rex's attention dot on the top-right corner
  | { kind: "badge"; image: BadgeImage } // Rex's status art stamped on the lower-right corner
  | { kind: "pie"; progress: number } // progress ring with a wedge, replaces the glyph
  | { kind: "dots"; frame: number } // three dots on the top-right corner, one bright
  | { kind: "spinner"; frame: number }; // indeterminate ring, replaces the glyph

export interface PaintOptions {
  /** Output canvas size in pixels (square). */
  size: number;
  /** "tab" anchors the front pill at the left so stacks grow to the right; "pane" centers a single pill. */
  layout: "tab" | "pane";
  /** Activity indicator drawn on the front pill. */
  indicator?: PaintIndicator;
}

type RGB = [number, number, number];

/** Rex's pill is 23×18 points. */
const PILL_ASPECT = 23 / 18;
const CORNER = 0.34; // of pill height
const GLYPH_BOX = 0.66; // of pill height
const GLYPH_MAX_WIDTH = 0.72; // of pill width
const STACK_OFFSET = 0.24; // of front pill width, per pill behind
const STACK_SCALE = 0.94; // per pill behind
const SUPERSAMPLE = 3;
const BADGE_SIZE = 0.52; // of pill height
const BADGE_OVERHANG = 0.16; // of badge size, past the pill's corner
const DOT_SIZE = 0.34; // of pill height
const DOT_OVERHANG = 0.25; // of dot diameter, past the pill's corner
const DOTS_SIZE = 0.14; // of pill height, each of the three dots
const DOTS_SPACING = 1.6; // centre to centre, in dot diameters
const RING_DIAMETER = 0.62; // of pill height
const RING_STROKE = 0.055; // of pill height
const TAU = Math.PI * 2;

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function stopsAt(gradient: IconGradient, t: number): RGB {
  const stops = gradient.stops;
  if (t <= stops[0].at) return hexToRgb(stops[0].hex);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].at) {
      const span = stops[i].at - stops[i - 1].at;
      const f = span <= 0 ? 0 : (t - stops[i - 1].at) / span;
      return mix(hexToRgb(stops[i - 1].hex), hexToRgb(stops[i].hex), f);
    }
  }
  return hexToRgb(stops[stops.length - 1].hex);
}

/** Colour of a gradient at (u, v) in the pill's unit square. */
function gradientAt(gradient: IconGradient, u: number, v: number): RGB {
  switch (gradient.style) {
    case "radial": {
      const radius = Math.max(gradient.scale, 0.05) * 0.5;
      const d = Math.hypot(u - gradient.centerX, v - gradient.centerY) / radius;
      return stopsAt(gradient, clamp01(d));
    }
    case "mesh": {
      // 3×3 colour grid interpolated bilinearly; stops are row-major.
      const stops = gradient.stops;
      if (stops.length < 9) return stopsAt(gradient, v);
      const gx = clamp01(u) * 2;
      const gy = clamp01(v) * 2;
      const cx = Math.min(1, Math.max(0, Math.floor(gx)));
      const cy = Math.min(1, Math.max(0, Math.floor(gy)));
      const fx = gx - cx;
      const fy = gy - cy;
      const c = (col: number, row: number) => hexToRgb(stops[row * 3 + col].hex);
      const top = mix(c(cx, cy), c(cx + 1, cy), fx);
      const bottom = mix(c(cx, cy + 1), c(cx + 1, cy + 1), fx);
      return mix(top, bottom, fy);
    }
    default: {
      // Linear: angle 0 points up, 90 points right (CSS convention).
      const rad = (gradient.angle * Math.PI) / 180;
      const dx = Math.sin(rad);
      const dy = -Math.cos(rad);
      const half = (Math.abs(dx) + Math.abs(dy)) / 2;
      const t = ((u - 0.5) * dx + (v - 0.5) * dy) / (2 * half) + 0.5;
      return stopsAt(gradient, clamp01(t));
    }
  }
}

function fillAt(solid: string, gradient: IconGradient | undefined, u: number, v: number): RGB {
  return gradient && gradient.stops.length > 0 ? gradientAt(gradient, u, v) : hexToRgb(solid);
}

/** Signed distance from a point to a rounded rectangle centred at the origin. */
function roundedRectDistance(px: number, py: number, halfW: number, halfH: number, radius: number): number {
  const qx = Math.abs(px) - halfW + radius;
  const qy = Math.abs(py) - halfH + radius;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - radius;
}

function sampleBadge(badge: BadgeImage, x: number, y: number): [number, number, number, number] | undefined {
  if (x < 0 || y < 0 || x >= badge.width - 1 || y >= badge.height - 1) return undefined;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const out: [number, number, number, number] = [0, 0, 0, 0];
  const taps: [number, number, number][] = [
    [x0, y0, (1 - fx) * (1 - fy)],
    [x0 + 1, y0, fx * (1 - fy)],
    [x0, y0 + 1, (1 - fx) * fy],
    [x0 + 1, y0 + 1, fx * fy],
  ];
  let alpha = 0;
  for (const [tx, ty, w] of taps) {
    const i = (ty * badge.width + tx) * 4;
    const a = (badge.rgba[i + 3] / 255) * w;
    out[0] += badge.rgba[i] * a;
    out[1] += badge.rgba[i + 1] * a;
    out[2] += badge.rgba[i + 2] * a;
    alpha += a;
  }
  if (alpha <= 0) return undefined;
  return [out[0] / alpha, out[1] / alpha, out[2] / alpha, alpha];
}

function sampleMask(mask: GlyphMask, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= mask.width - 1 || y >= mask.height - 1) return 0;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const i = y0 * mask.width + x0;
  const a = mask.alpha[i];
  const b = mask.alpha[i + 1];
  const c = mask.alpha[i + mask.width];
  const d = mask.alpha[i + mask.width + 1];
  return ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy) / 255;
}

interface PillPlacement {
  definition: GlyphDefinition;
  mask?: GlyphMask;
  silhouette?: GlyphMask;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

interface GlyphFit {
  scale: number; // mask px -> canvas px
  x: number; // canvas x of mask box x0
  y: number;
}

/** A pie or spinner replacing the glyph of the front pill. */
type RingOverlay = { kind: "pie"; progress: number } | { kind: "spinner"; frame: number; frames: number };

/** Clockwise angle from 12 o'clock, 0..TAU. */
function clockAngle(dx: number, dy: number): number {
  const a = Math.atan2(dx, -dy);
  return a < 0 ? a + TAU : a;
}

/** Coverage (0..1) of Rex's progress ring and wedge, or spinner arc, at a point relative to the pill centre. */
function ringCoverage(overlay: RingOverlay, dx: number, dy: number, pillHeight: number): number {
  const outer = (pillHeight * RING_DIAMETER) / 2;
  const stroke = pillHeight * RING_STROKE;
  const r = Math.hypot(dx, dy);
  const ring = clamp01(r - (outer - stroke) + 0.5) * clamp01(outer - r + 0.5);
  const angle = clockAngle(dx, dy);
  if (overlay.kind === "pie") {
    const wedgeRadius = outer - 2 * stroke;
    const sweep = clamp01(overlay.progress / 100) * TAU;
    const wedge = r <= wedgeRadius + 0.5 && (sweep >= TAU || angle <= sweep) ? clamp01(wedgeRadius - r + 0.5) : 0;
    return Math.max(ring, wedge);
  }
  const start = (overlay.frame / overlay.frames) * TAU;
  const rel = (angle - start + TAU) % TAU;
  const bright = rel <= TAU / 4;
  return ring * (bright ? 1 : 0.35);
}

function fitGlyph(mask: GlyphMask, pill: PillPlacement): GlyphFit {
  const boxW = mask.box.x1 - mask.box.x0 + 1;
  const boxH = mask.box.y1 - mask.box.y0 + 1;
  const maxH = pill.height * GLYPH_BOX;
  const maxW = pill.width * GLYPH_MAX_WIDTH;
  const scale = Math.min(maxH / boxH, maxW / boxW);
  return { scale, x: pill.cx - (boxW * scale) / 2, y: pill.cy - (boxH * scale) / 2 };
}

/** Colour and alpha of one pill at a canvas point, or undefined outside it. */
function shadePill(
  pill: PillPlacement,
  x: number,
  y: number,
  fits: { glyph?: GlyphFit; silhouette?: GlyphFit },
  overlay?: RingOverlay,
) {
  const halfW = pill.width / 2;
  const halfH = pill.height / 2;
  const radius = pill.height * CORNER;
  const d = roundedRectDistance(x - pill.cx, y - pill.cy, halfW, halfH, radius);
  const edge = Math.max(1, pill.width * 0.022); // dark outer ring thickness in px
  if (d > edge) return undefined;
  const u = (x - pill.cx) / pill.width + 0.5;
  const v = (y - pill.cy) / pill.height + 0.5;
  const def = pill.definition;
  let rgb = fillAt(def.background, def.backgroundGradient, u, v);
  // Gloss: lighter toward the top, darker toward the bottom.
  const lighten = Math.max(0, 0.5 - v) * 0.56;
  const darken = Math.max(0, v - 0.5) * 0.3;
  rgb = mix(rgb, [255, 255, 255], lighten);
  rgb = mix(rgb, [0, 0, 0], darken);
  // Inner highlight along the top edge.
  const inset = -d; // distance inside the edge
  const highlightBand = pill.height * 0.07;
  if (inset >= 0 && inset < highlightBand) {
    const strength = (1 - inset / highlightBand) * (0.55 * Math.max(0, 0.75 - v));
    rgb = mix(rgb, [255, 255, 255], strength);
  }
  if (fits.silhouette && pill.silhouette && def.glyphBackground) {
    const f = fits.silhouette;
    const a = sampleMask(
      pill.silhouette,
      (x - f.x) / f.scale + pill.silhouette.box.x0,
      (y - f.y) / f.scale + pill.silhouette.box.y0,
    );
    if (a > 0) rgb = mix(rgb, hexToRgb(def.glyphBackground), a * def.glyphBackgroundOpacity);
  }
  if (overlay) {
    const a = ringCoverage(overlay, x - pill.cx, y - pill.cy, pill.height);
    if (a > 0) rgb = mix(rgb, fillAt(def.foreground, def.foregroundGradient, u, v), a);
  } else if (fits.glyph && pill.mask) {
    const f = fits.glyph;
    const a = sampleMask(pill.mask, (x - f.x) / f.scale + pill.mask.box.x0, (y - f.y) / f.scale + pill.mask.box.y0);
    if (a > 0) rgb = mix(rgb, fillAt(def.foreground, def.foregroundGradient, u, v), a);
  }
  // Coverage: solid inside, anti-aliased edge, then a dark ring just outside.
  const inside = clamp01(0.5 - d);
  if (inside >= 1) return { rgb, alpha: 1 };
  const ring = clamp01(edge + 0.5 - d) * 0.5;
  const alpha = inside + (1 - inside) * ring;
  const blended = mix([0, 0, 0], rgb, alpha > 0 ? inside / alpha : 0);
  return { rgb: blended, alpha };
}

export interface PillSpec {
  definition: GlyphDefinition;
  mask?: GlyphMask;
  silhouette?: GlyphMask;
}

type Shade = { rgb: RGB; alpha: number } | undefined;

/** A filled circle with a thin dark outline, as Rex draws its attention dot. */
function circleShade(cx: number, cy: number, diameter: number, color: RGB, opacity: number, outline: number) {
  return (x: number, y: number): Shade => {
    const r = Math.hypot(x - cx, y - cy);
    const inside = clamp01(diameter / 2 - r + 0.5) * opacity;
    const rim = clamp01(diameter / 2 + outline - r + 0.5) * 0.55;
    const alpha = inside + (1 - inside) * rim;
    if (alpha <= 0.001) return undefined;
    return { rgb: mix([0, 0, 0], color, inside / alpha), alpha };
  };
}

function badgeShade(image: BadgeImage, x0: number, y0: number, scale: number) {
  return (x: number, y: number): Shade => {
    const s = sampleBadge(image, (x - x0) / scale, (y - y0) / scale);
    return s ? { rgb: [s[0], s[1], s[2]], alpha: s[3] } : undefined;
  };
}

/** Whether the indicator reaches past the pill's corner (and the layout must leave room for it). */
function overhangs(indicator?: PaintIndicator): boolean {
  return indicator?.kind === "dot" || indicator?.kind === "dots" || indicator?.kind === "badge";
}

function foregroundOf(pill: PillPlacement): RGB {
  return fillAt(pill.definition.foreground, pill.definition.foregroundGradient, 0.5, 0.5);
}

/** Overlays drawn over the finished pills, back to front. */
function cornerOverlays(indicator: PaintIndicator | undefined, front: PillPlacement, size: number) {
  const overlays: ((x: number, y: number) => Shade)[] = [];
  if (!indicator) return overlays;
  const right = front.cx + front.width / 2;
  const top = front.cy - front.height / 2;
  const bottom = front.cy + front.height / 2;
  const outline = Math.max(1, front.height * 0.012);
  switch (indicator.kind) {
    case "dot": {
      const d = front.height * DOT_SIZE;
      const cx = Math.min(right - d / 2 + d * DOT_OVERHANG, size - d / 2 - outline);
      const cy = Math.max(top + d / 2 - d * DOT_OVERHANG, d / 2 + outline);
      overlays.push(circleShade(cx, cy, d, hexToRgb(indicator.color), 1, outline));
      break;
    }
    case "dots": {
      const d = front.height * DOTS_SIZE;
      const step = d * DOTS_SPACING;
      const cxLast = Math.min(right - d / 2 + d * DOT_OVERHANG * 1.5, size - d / 2 - outline);
      const cy = Math.max(top + d / 2 - d * DOT_OVERHANG * 1.5, d / 2 + outline);
      const color = foregroundOf(front);
      const bright = ((indicator.frame % 3) + 3) % 3;
      for (let i = 0; i < 3; i++) {
        const cx = cxLast - (2 - i) * step;
        overlays.push(circleShade(cx, cy, d, color, i === bright ? 1 : 0.45, outline * 0.8));
      }
      break;
    }
    case "badge": {
      const badgePx = front.height * BADGE_SIZE;
      const scale = badgePx / indicator.image.height;
      const overhang = badgePx * BADGE_OVERHANG;
      const x = Math.min(right - badgePx + overhang, size - badgePx);
      const y = Math.min(bottom - badgePx + overhang, size - badgePx);
      overlays.push(badgeShade(indicator.image, x, y, scale));
      break;
    }
  }
  return overlays;
}

/** Paint one pill or a fanned stack (front pill first) into an RGBA buffer. */
export function paintPills(
  pills: PillSpec[],
  options: PaintOptions,
): { width: number; height: number; data: Uint8Array } {
  const size = options.size;
  const indicator = options.indicator;
  // Size by the pills actually shown: a lone pill fills the slot, a fan shrinks only as much as it must.
  // A corner indicator pokes past the pill, so leave it a little room.
  const fan = 1 + STACK_OFFSET * Math.max(0, pills.length - 1);
  const fill = overhangs(indicator) ? 0.92 : 0.98;
  const frontW = (size * fill) / fan;
  const frontH = frontW / PILL_ASPECT;
  const totalW = frontW * fan;
  const startX = options.layout === "pane" || pills.length === 1 ? (size - totalW) / 2 : size * 0.01;
  const placements: PillPlacement[] = pills.map((pill, i) => {
    const scale = Math.pow(STACK_SCALE, i);
    return {
      definition: pill.definition,
      mask: pill.mask,
      silhouette: pill.silhouette,
      width: frontW * scale,
      height: frontH * scale,
      cx: startX + frontW / 2 + frontW * STACK_OFFSET * i,
      cy: size / 2,
    };
  });
  const fits = placements.map((p) => ({
    glyph: p.mask ? fitGlyph(p.mask, p) : undefined,
    silhouette: p.silhouette ? fitGlyph(p.silhouette, p) : undefined,
  }));
  const ring: RingOverlay | undefined =
    indicator?.kind === "pie"
      ? { kind: "pie", progress: indicator.progress }
      : indicator?.kind === "spinner"
        ? { kind: "spinner", frame: indicator.frame, frames: 8 }
        : undefined;
  const overlays = placements.length > 0 ? cornerOverlays(indicator, placements[0], size) : [];
  const data = new Uint8Array(size * size * 4);
  const ss = SUPERSAMPLE;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = px + (sx + 0.5) / ss;
          const y = py + (sy + 0.5) / ss;
          // back to front
          let cr = 0,
            cg = 0,
            cb = 0,
            ca = 0;
          for (let i = placements.length - 1; i >= 0; i--) {
            const s = shadePill(placements[i], x, y, fits[i], i === 0 ? ring : undefined);
            if (!s) continue;
            const out = s.alpha + ca * (1 - s.alpha);
            if (out <= 0) continue;
            cr = (s.rgb[0] * s.alpha + cr * ca * (1 - s.alpha)) / out;
            cg = (s.rgb[1] * s.alpha + cg * ca * (1 - s.alpha)) / out;
            cb = (s.rgb[2] * s.alpha + cb * ca * (1 - s.alpha)) / out;
            ca = out;
          }
          for (const overlay of overlays) {
            const o = overlay(x, y);
            if (!o) continue;
            const out = o.alpha + ca * (1 - o.alpha);
            if (out <= 0) continue;
            cr = (o.rgb[0] * o.alpha + cr * ca * (1 - o.alpha)) / out;
            cg = (o.rgb[1] * o.alpha + cg * ca * (1 - o.alpha)) / out;
            cb = (o.rgb[2] * o.alpha + cb * ca * (1 - o.alpha)) / out;
            ca = out;
          }
          r += cr * ca;
          g += cg * ca;
          b += cb * ca;
          a += ca;
        }
      }
      const n = ss * ss;
      const idx = (py * size + px) * 4;
      if (a > 0) {
        data[idx] = Math.round(r / a);
        data[idx + 1] = Math.round(g / a);
        data[idx + 2] = Math.round(b / a);
        data[idx + 3] = Math.round((a / n) * 255);
      }
    }
  }
  return { width: size, height: size, data };
}

/** Build a mask from decoded RGBA pixels (uses the alpha channel). */
export function maskFromRgba(width: number, height: number, rgba: Uint8Array): GlyphMask {
  const alpha = new Uint8Array(width * height);
  let x0 = width,
    y0 = height,
    x1 = -1,
    y1 = -1;
  for (let i = 0; i < width * height; i++) {
    const a = rgba[i * 4 + 3];
    alpha[i] = a;
    if (a > 8) {
      const x = i % width;
      const y = (i - x) / width;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) {
    x0 = 0;
    y0 = 0;
    x1 = width - 1;
    y1 = height - 1;
  }
  return { width, height, alpha, box: { x0, y0, x1, y1 } };
}
