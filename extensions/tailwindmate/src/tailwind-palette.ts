/**
 * Flatten all Tailwind colors (`red.50`, `red.100`, …) into
 * `{ token: hex }` pairs.
 */
import * as colors from "tailwindcss/colors";

type Palette = Record<string, string>;

function isShade(key: string): boolean {
  return /^\d+$/.test(key);
}

export const palette: Palette = Object.entries(colors).reduce((acc, [hue, value]) => {
  if (typeof value !== "object") return acc; // skip black/white etc.

  Object.entries(value as Record<string, string>).forEach(([shade, hex]) => {
    if (isShade(shade)) {
      acc[`${hue}-${shade}`] = hex.toLowerCase();
    }
  });
  return acc;
}, {} as Palette);
