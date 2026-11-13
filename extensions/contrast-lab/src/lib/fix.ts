// Nearest passing foreground color for a target WCAG ratio.
//
// Strategy: hold the foreground's chroma and hue, move its OKLCH lightness toward
// the extreme that increases contrast (darken on a light bg, lighten on a dark bg),
// and binary-search for the lightness closest to the original that still meets the
// target. Every candidate is gamut-mapped back into sRGB.
//
// The value we return is a HEX string, and 8-bit hex rounding can pull a
// just-passing OKLCH candidate back below the target. For example #777777 sits at
// 4.48 against white; the mathematically-correct nudge is smaller than one hex step,
// so it rounds straight back to #777777 and the "fix" looks identical to the input.
// To avoid that, after the search we re-measure the *rounded hex* and, if it still
// falls short, step one hex increment further toward the extreme until the rounded
// hex genuinely clears the target (or we reach the extreme). We also report when the
// original already passes, so the UI never presents a no-op fix.

import { luminance, toOklch, gamutMapOklch, toHex, formatOklch } from "./color";
import { rawRatio } from "./wcag";
import type { FixResult } from "./contrast";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Backgrounds lighter than this (WCAG luminance) call for darkening the text. */
const LIGHT_BG_LUMINANCE = 0.18;

/** OKLCH lightness increment used when stepping past a hex-rounding boundary. */
const LIGHTNESS_STEP = 1 / 1024;

/** Default WCAG AA target for normal text. */
export const DEFAULT_TARGET = 4.5;

export function nearestPassing(fg: string, bg: string, target = DEFAULT_TARGET): FixResult {
  const origin = toOklch(fg);

  // No change needed: the original foreground already meets the target.
  const originRatio = rawRatio(fg, bg);
  if (originRatio >= target) {
    return {
      hex: toHex(origin),
      oklch: formatOklch(origin),
      ratio: round2(originRatio),
      alreadyPasses: true,
    };
  }

  const goDarker = luminance(bg) > LIGHT_BG_LUMINANCE;
  const chroma = origin.c;
  const hue = origin.h ?? 0;
  const ratioAt = (l: number): number => rawRatio(gamutMapOklch(l, chroma, hue), bg);

  // Binary-search the continuous lightness closest to the original that meets target.
  let lo = goDarker ? 0 : origin.l;
  let hi = goDarker ? origin.l : 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (goDarker) {
      if (ratioAt(mid) >= target) lo = mid;
      else hi = mid;
    } else {
      if (ratioAt(mid) >= target) hi = mid;
      else lo = mid;
    }
  }

  // Hex-accurate correction. The value we return is a rounded hex, so verify THAT
  // clears the target; if 8-bit rounding dropped it below, step one increment
  // further toward the extreme until the rounded hex passes. At the AA target the
  // extreme (pure black on a light bg, pure white on a dark bg) always clears 4.5,
  // so the loop is guaranteed to land on a passing hex.
  const sign = goDarker ? -1 : 1;
  const limit = goDarker ? 0 : 1;
  let l = goDarker ? lo : hi;
  let hex = toHex(gamutMapOklch(l, chroma, hue));
  let hexRatio = rawRatio(hex, bg);
  while (hexRatio < target && (goDarker ? l > limit : l < limit)) {
    l = Math.min(1, Math.max(0, l + sign * LIGHTNESS_STEP));
    hex = toHex(gamutMapOklch(l, chroma, hue));
    hexRatio = rawRatio(hex, bg);
  }

  return {
    hex,
    oklch: formatOklch(toOklch(hex)),
    ratio: round2(hexRatio),
    alreadyPasses: false,
  };
}
