/** Deterministic fallback palette (Google-ish hues), used only when Chrome has
 * no real color for a profile. Kept separate so generated colors are never
 * mistaken for a profile's actual Chrome theme color. */
const FALLBACK_PALETTE = ["#0B57D0", "#188038", "#D93025", "#E37400", "#9334E6", "#12A4AF", "#A50E0E", "#1A73E8"];

/**
 * Decode Chrome's signed 32-bit ARGB color integer (e.g. `profile_color_seed`)
 * into a `#RRGGBB` string. Returns undefined for missing/zero/invalid values so
 * callers can fall back cleanly. Alpha is dropped (Raycast tints are opaque).
 */
export function decodeChromeColor(signed: number | undefined): string | undefined {
  if (typeof signed !== "number" || !Number.isFinite(signed) || signed === 0) {
    return undefined;
  }
  const unsigned = signed >>> 0;
  const r = (unsigned >> 16) & 0xff;
  const g = (unsigned >> 8) & 0xff;
  const b = unsigned & 0xff;
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** A stable, pleasant color derived from a profile's directory, used only when
 * no real Chrome color is available. Deterministic so a profile keeps its color
 * across launches. */
export function generatedColor(seedKey: string): string {
  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) {
    hash = (hash * 31 + seedKey.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}
