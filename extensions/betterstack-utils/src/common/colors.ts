import { createHash } from "crypto";

export type Appearance = "light" | "dark";

export interface SchedulePalette {
  heading: string;
  label: string;
  marker: string;
  todayHighlight: string;
  gridLine: string;
  barTopBorder: string;
  skeletonOverlay: string;
  skeletonBar: string;
}

export const Colors = {
  WHITE: "#FFFFFF",
  DEEP_DARK: "#0B0C15",
  DARK: "#1F2433",
  SLATE: "#2D374C",
  DIM: "#718096",
  SUBTLE: "#AEB8D3",
  FROST: "#F3F5FA",
  SKELETON: "#28354E",
};

export const RotaColors = {
  BLUE: "#21A7FF",
  GREEN: "#16C77A",
  INDIGO: "#7F88FF",
  ORANGE: "#FF8738",
  PURPLE: "#D36BFF",
  RED: "#FF5E7A",
  YELLOW: "#E7B84A",
};

const ROTA_SVG_PALETTE = [
  RotaColors.BLUE,
  RotaColors.GREEN,
  RotaColors.INDIGO,
  RotaColors.ORANGE,
  RotaColors.PURPLE,
  RotaColors.RED,
  RotaColors.YELLOW,
];

export function getThemeColor(bgHex: string): string {
  return relativeLuminance(bgHex) > 0.179 ? Colors.DARK : Colors.WHITE;
}

export function getColor(value: string): string {
  const hash = createHash("shake256").update(value).digest("hex");

  return ROTA_SVG_PALETTE[parseInt(hash.slice(0, 8), 16) % ROTA_SVG_PALETTE.length] ?? RotaColors.BLUE;
}

export function getSchedulePalette(appearance: Appearance): SchedulePalette {
  const isLight = appearance === "light";

  return {
    heading: isLight ? Colors.DARK : Colors.FROST,
    label: isLight ? Colors.SLATE : Colors.SUBTLE,
    marker: isLight ? Colors.DARK : Colors.WHITE,
    todayHighlight: isLight ? toRgba(Colors.DIM, 0.25) : toRgba(Colors.DEEP_DARK, 0.5),
    gridLine: isLight ? toRgba(Colors.SLATE, 0.3) : toRgba(Colors.DIM, 0.3),
    barTopBorder: isLight ? toRgba(Colors.SLATE, 0.3) : Colors.SLATE,
    skeletonOverlay: isLight ? toRgba(Colors.DIM, 0.12) : toRgba(Colors.SKELETON, 0.2),
    skeletonBar: isLight ? toRgba(Colors.DIM, 0.35) : Colors.SKELETON,
  };
}

export function toRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function relativeLuminance(hex: string): number {
  const r = linearize(parseInt(hex.slice(1, 3), 16) / 255);
  const g = linearize(parseInt(hex.slice(3, 5), 16) / 255);
  const b = linearize(parseInt(hex.slice(5, 7), 16) / 255);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
