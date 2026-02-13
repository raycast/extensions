import type { ColorblindType, RGB } from "./types";

/**
 * Viénot et al. (1999) simulation matrices for color vision deficiency.
 * These transform linear sRGB to simulate how colors appear under each type.
 *
 * Each matrix is a 3x3 row-major array: [r->r, g->r, b->r, r->g, g->g, b->g, r->b, g->b, b->b]
 */
const SIMULATION_MATRICES: Record<ColorblindType, number[]> = {
  // Red-blind: L-cone deficiency
  protanopia: [
    0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998,
  ],
  // Green-blind: M-cone deficiency
  deuteranopia: [
    0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881,
  ],
  // Blue-blind: S-cone deficiency
  tritanopia: [
    1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039,
  ],
};

/** Convert sRGB (0-255) to linear RGB (0-1) */
function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Convert linear RGB (0-1) to sRGB (0-255) */
function linearToSrgb(c: number): number {
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, s * 255)));
}

/**
 * Simulate how a color appears under a specific type of color vision deficiency.
 */
export function simulateColorblind(rgb: RGB, type: ColorblindType): RGB {
  const m = SIMULATION_MATRICES[type];
  const lr = srgbToLinear(rgb.r);
  const lg = srgbToLinear(rgb.g);
  const lb = srgbToLinear(rgb.b);

  return {
    r: linearToSrgb(m[0] * lr + m[1] * lg + m[2] * lb),
    g: linearToSrgb(m[3] * lr + m[4] * lg + m[5] * lb),
    b: linearToSrgb(m[6] * lr + m[7] * lg + m[8] * lb),
  };
}

/**
 * Calculate the perceptual color difference (CIE76 delta E in Lab space, simplified).
 * Returns a value where 0 = identical, >30 = very different colors.
 */
export function colorDistance(a: RGB, b: RGB): number {
  // Use a simple weighted Euclidean distance in RGB space
  // (redmean approximation for perceptual uniformity)
  const rmean = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt((2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db);
}

export const COLORBLIND_TYPES: { type: ColorblindType; label: string }[] = [
  { type: "protanopia", label: "Protanopia (red-blind)" },
  { type: "deuteranopia", label: "Deuteranopia (green-blind)" },
  { type: "tritanopia", label: "Tritanopia (blue-blind)" },
];
