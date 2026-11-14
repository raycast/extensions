// Thin, typed wrappers around culori for the color operations this library needs:
// parsing, OKLCH conversion, sRGB gamut mapping, hex/oklch formatting, and luminance.
// Everything here is framework-free and unit-testable.

import { parse, wcagLuminance, converter, formatHex, clampChroma, blend, type CuloriColor } from "culori";

/** An OKLCH color with the channels we rely on guaranteed present after conversion. */
export interface OklchColor extends CuloriColor {
  mode: "oklch";
  l: number;
  c: number;
  h?: number;
  alpha?: number;
}

const toOklchConverter = converter("oklch");

/**
 * Parse a CSS color string culori understands: hex (3/4/6/8), `rgb()/rgba()`,
 * `hsl()/hsla()`, `oklch()`, and more. Returns `undefined` if unparseable.
 */
export function parseColor(input: string): CuloriColor | undefined {
  return parse(input);
}

/** Whether the input parses as a color at all. */
export function isValidColor(input: string): boolean {
  return parse(input) !== undefined;
}

/** WCAG relative luminance (0..1) of a color string or object. */
export function luminance(color: string | CuloriColor): number {
  return wcagLuminance(color);
}

/** Convert any color to OKLCH coordinates. */
export function toOklch(color: string | CuloriColor): OklchColor {
  // The OKLCH converter always yields l/c (achromatic colors leave h undefined).
  return toOklchConverter(color) as unknown as OklchColor;
}

/**
 * Build an in-gamut sRGB color from OKLCH coordinates, reducing chroma as needed.
 * Returned in OKLCH mode so it can be both measured and formatted.
 */
export function gamutMapOklch(l: number, c: number, h: number): OklchColor {
  return clampChroma({ mode: "oklch", l, c, h }, "oklch", "rgb") as unknown as OklchColor;
}

/** Format a color as a `#rrggbb` hex string. Inputs here are always representable. */
export function toHex(color: CuloriColor): string {
  return formatHex(color) ?? "#000000";
}

/**
 * Composite a possibly-translucent color over an opaque backdrop and return an
 * opaque hex. WCAG/APCA assume opaque colors, so alpha inputs (e.g. `rgba(...)`,
 * `#rrggbbaa`) must be flattened before scoring or they score like opaque colors.
 */
export function compositeOver(color: string, backdropHex: string): string {
  const parsed = parse(color);
  if (!parsed) return backdropHex;
  const alpha = parsed.alpha ?? 1;
  if (alpha >= 1) return toHex(parsed); // already opaque
  return formatHex(blend([backdropHex, color], "normal")) ?? backdropHex;
}

/** Format OKLCH coordinates as a rounded `oklch()` string (L 3dp, C 4dp, H 2dp). */
export function formatOklch(color: { l: number; c?: number; h?: number }): string {
  return `oklch(${color.l.toFixed(3)} ${(color.c ?? 0).toFixed(4)} ${(color.h ?? 0).toFixed(2)})`;
}
