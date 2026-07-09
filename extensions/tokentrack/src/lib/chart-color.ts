/** Shared hex helpers and chart fill tuning for readable in-bar labels. */

export function parseHex(
  hex: string,
): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function adjustHex(hex: string, factor: number): string {
  const c = parseHex(hex);
  if (!c) return hex;
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(c.r * factor);
  const g = clamp(c.g * factor);
  const b = clamp(c.b * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function mixHex(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a;
  const mix = (x: number, y: number) => Math.round(x * (1 - t) + y * t);
  const r = mix(ca.r, cb.r);
  const g = mix(ca.g, cb.g);
  const bl = mix(ca.b, cb.b);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function relativeLuminance(hex: string): number {
  const c = parseHex(hex);
  if (!c) return 0;
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/** Readable mint anchor for light brand colors (e.g. Cursor). */
const READABLE_MINT = "#4AAF6A";

/**
 * Darken very light brand colors so white chart labels stay readable.
 * Claude/Codex blues and oranges are left unchanged.
 */
export function chartFillHex(brandHex: string): string {
  const lum = relativeLuminance(brandHex);
  if (lum < 0.5) return brandHex;

  const mix = lum > 0.78 ? 0.58 : lum > 0.68 ? 0.48 : lum > 0.58 ? 0.36 : 0.22;
  return mixHex(brandHex, READABLE_MINT, mix);
}
