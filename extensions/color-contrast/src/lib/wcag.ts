import {
  composite,
  contrastRatio,
  hslToRgb,
  RGB,
  rgbToHsl,
  toHex,
} from "./color";

export const THRESHOLDS = {
  aaLarge: 3,
  aaNormal: 4.5,
  aaaLarge: 4.5,
  aaaNormal: 7,
  uiComponents: 3,
};

export interface Grades {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
  uiComponents: boolean;
}

export function grade(ratio: number): Grades {
  return {
    ratio,
    aaNormal: ratio >= THRESHOLDS.aaNormal,
    aaLarge: ratio >= THRESHOLDS.aaLarge,
    aaaNormal: ratio >= THRESHOLDS.aaaNormal,
    aaaLarge: ratio >= THRESHOLDS.aaaLarge,
    uiComponents: ratio >= THRESHOLDS.uiComponents,
  };
}

const WHITE: RGB = { r: 255, g: 255, b: 255, a: 1 };

export interface Suggestion {
  hex: string;
  ratio: number;
  /** Whether the suggestion actually reaches the requested target ratio. */
  reachedTarget: boolean;
}

/**
 * Finds the nearest color to `foreground` (by lightness) that meets `target`
 * contrast against `background`. If the target is unreachable (e.g. AAA against
 * a mid-gray), returns the highest-contrast option with `reachedTarget: false`.
 */
export function suggestForeground(
  foreground: RGB,
  background: RGB,
  target: number,
): Suggestion | null {
  const solidBackground = composite(background, WHITE);
  const base = composite(foreground, solidBackground);
  const { h, s, l: originalLightness } = rgbToHsl(base);

  let best: { hex: string; ratio: number; distance: number } | null = null;
  let fallback: { hex: string; ratio: number } | null = null;

  for (let lightness = 0; lightness <= 100; lightness++) {
    const candidate: RGB = { ...hslToRgb(h, s / 100, lightness / 100), a: 1 };
    const ratio = contrastRatio(candidate, solidBackground);

    if (!fallback || ratio > fallback.ratio) {
      fallback = { hex: toHex(candidate), ratio };
    }
    if (ratio >= target) {
      const distance = Math.abs(lightness - originalLightness);
      if (!best || distance < best.distance) {
        best = { hex: toHex(candidate), ratio, distance };
      }
    }
  }

  if (best) {
    return { hex: best.hex, ratio: best.ratio, reachedTarget: true };
  }
  // Nothing reached the target (e.g. AAA against a mid-gray) — offer the closest.
  if (fallback) {
    return { hex: fallback.hex, ratio: fallback.ratio, reachedTarget: false };
  }
  return null;
}
