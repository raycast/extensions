import type { HSL, RGB } from "./types";

/**
 * Convert RGB (0-255) to HSL (h: 0-360, s: 0-100, l: 0-100).
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function getLightnessDescriptor(l: number): string {
  if (l <= 5) return "very dark";
  if (l <= 20) return "dark";
  if (l <= 40) return "medium-dark";
  if (l <= 60) return "medium";
  if (l <= 80) return "light";
  if (l <= 95) return "very light";
  return "near-white";
}

export function getSaturationDescriptor(s: number): string {
  if (s <= 10) return "gray";
  if (s <= 30) return "muted";
  if (s <= 60) return "moderate";
  if (s <= 85) return "vivid";
  return "bold";
}

/**
 * Pick the single most distinguishing qualifier for a color based on HSL.
 * Prioritizes extreme lightness, then saturation character.
 */
export function getBriefQualifier(hsl: HSL): string | null {
  // These match buildDescription's thresholds for black/white/achromatic
  if (hsl.l <= 2 && hsl.s <= 5) return null;
  if (hsl.l >= 98 && hsl.s <= 5) return null;
  if (hsl.s <= 10) return null; // achromatic, handled separately

  // Extreme lightness is the most notable trait
  if (hsl.l <= 15) return "dark";
  if (hsl.l >= 85) return "pale";

  // Otherwise, saturation is the most descriptive single trait
  if (hsl.s <= 30) return "muted";
  if (hsl.s <= 60) return "soft";
  if (hsl.s <= 85) return "vivid";
  return "bold";
}

/**
 * Get a simple, intuitive color name from HSL values.
 * Uses hue for chromatic colors, with special handling for browns and grays.
 */
export function getSimpleColorName(hsl: HSL): string {
  // Achromatic
  if (hsl.s <= 10) {
    if (hsl.l <= 10) return "black";
    if (hsl.l >= 90) return "white";
    return "gray";
  }

  // Very dark with low saturation → effectively black
  if (hsl.l <= 5) return "black";
  // Very light with low saturation → effectively white
  if (hsl.l >= 95) return "white";

  const { h, s, l } = hsl;

  // Brown: warm hues (red-orange-yellow) that are dark and not highly saturated
  if ((h < 45 || h >= 345) && l < 40 && s < 70) return "brown";

  // Hue-based names
  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 70) return "yellow";
  if (h < 150) return "green";
  if (h < 190) return "teal";
  if (h < 260) return "blue";
  if (h < 290) return "purple";
  return "pink";
}
