import type { TraditionalColor } from "./types";

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export function hexToRgb(hex: string): RgbColor {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid HEX color: ${hex}`);
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function formatRgb(color: TraditionalColor): string {
  const { r, g, b } = hexToRgb(color.hex);
  return `${r}, ${g}, ${b}`;
}

export function formatCssRgb(color: TraditionalColor): string {
  const { r, g, b } = hexToRgb(color.hex);
  return `rgb(${r} ${g} ${b})`;
}

export function formatHsl(color: TraditionalColor): string {
  return `${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%`;
}

export function formatCssHsl(color: TraditionalColor): string {
  return `hsl(${color.hsl.h} ${color.hsl.s}% ${color.hsl.l}%)`;
}

export function formatCssVariable(color: TraditionalColor): string {
  return `--ctc-${color.number}: ${color.hex};`;
}

export function formatJson(color: TraditionalColor): string {
  return JSON.stringify({
    number: color.number,
    name: color.name,
    hex: color.hex,
    rgb: formatRgb(color),
    hsl: formatHsl(color),
  });
}
