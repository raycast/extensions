// Public surface of the contrast core. `analyze(input)` is the single entry point:
// it validates the colors, then returns WCAG, APCA, and "nearest passing" results
// in one structured object. This module is pure (no Raycast/React imports) so it
// can be unit-tested with Node's test runner and reused anywhere.

import { isValidColor, compositeOver } from "./color";
import { evaluateWcag } from "./wcag";
import { evaluateApca } from "./apca";
import { nearestPassing } from "./fix";

export type ApcaWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface ContrastInput {
  foreground: string; // hex (3/4/6/8), rgb(), hsl(), or oklch()
  background: string;
  fontSizePx?: number; // default 16
  fontWeight?: ApcaWeight; // default 400
}

export interface WcagResult {
  ratio: number; // 1..21, 2dp
  aaNormal: boolean; // >= 4.5
  aaLarge: boolean; // >= 3
  aaaNormal: boolean; // >= 7
  aaaLarge: boolean; // >= 4.5
}

export interface ApcaResult {
  lc: number; // signed, 2dp (negative = light text on dark bg)
  absLc: number;
  minFontPx: number | null; // min px for the given weight at this Lc; null if sentinel (not usable)
  passesAtSize: boolean; // fontSizePx >= minFontPx and usable
}

export interface FixResult {
  hex: string; // suggested foreground, hex
  oklch: string; // suggested foreground, rounded oklch() string
  ratio: number; // achieved WCAG ratio (>= target; at the AA target a passing color always exists)
  alreadyPasses: boolean; // true if the original foreground already meets the target (no change needed)
}

export interface ContrastResult {
  valid: boolean; // false if either color failed to parse
  error?: string;
  input: Required<ContrastInput>;
  resolved: { foreground: string; background: string }; // opaque hex actually scored (alpha composited)
  wcag: WcagResult;
  apca: ApcaResult;
  fixForWcagAA: FixResult; // nearest passing foreground for WCAG AA normal (target 4.5)
}

export const DEFAULT_FONT_SIZE_PX = 16;
export const DEFAULT_FONT_WEIGHT: ApcaWeight = 400;

/** WCAG AA normal-text target the fixer aims for. */
const WCAG_AA_TARGET = 4.5;

function zeroedResult(input: Required<ContrastInput>, error: string): ContrastResult {
  return {
    valid: false,
    error,
    input,
    resolved: { foreground: "", background: "" },
    wcag: { ratio: 0, aaNormal: false, aaLarge: false, aaaNormal: false, aaaLarge: false },
    apca: { lc: 0, absLc: 0, minFontPx: null, passesAtSize: false },
    fixForWcagAA: { hex: "", oklch: "", ratio: 0, alreadyPasses: false },
  };
}

/** Validate the input colors, then compute WCAG, APCA, and the nearest passing fix. */
export function analyze(input: ContrastInput): ContrastResult {
  const fs = input.fontSizePx;
  const resolved: Required<ContrastInput> = {
    foreground: input.foreground,
    background: input.background,
    // Accept a font size only if it is a finite number > 0; otherwise use the default.
    // (Number() / the form can yield 0, -5, or Infinity, which are not valid sizes.)
    fontSizePx: typeof fs === "number" && Number.isFinite(fs) && fs > 0 ? fs : DEFAULT_FONT_SIZE_PX,
    fontWeight: input.fontWeight ?? DEFAULT_FONT_WEIGHT,
  };

  const fgValid = isValidColor(resolved.foreground);
  const bgValid = isValidColor(resolved.background);
  if (!fgValid || !bgValid) {
    const which = !fgValid && !bgValid ? "foreground and background" : !fgValid ? "foreground" : "background";
    return zeroedResult(resolved, `Could not parse the ${which} color. Use hex (3/4/6/8), rgb(), hsl(), or oklch().`);
  }

  // Flatten any alpha before scoring: bg over white, then fg over the resolved bg.
  // WCAG/APCA assume opaque colors, so translucent inputs must be composited first.
  const opaqueBg = compositeOver(resolved.background, "#ffffff");
  const opaqueFg = compositeOver(resolved.foreground, opaqueBg);

  return {
    valid: true,
    input: resolved,
    resolved: { foreground: opaqueFg, background: opaqueBg },
    wcag: evaluateWcag(opaqueFg, opaqueBg),
    apca: evaluateApca(opaqueFg, opaqueBg, resolved.fontSizePx, resolved.fontWeight),
    fixForWcagAA: nearestPassing(opaqueFg, opaqueBg, WCAG_AA_TARGET),
  };
}
