import { createHash } from "crypto";

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

export function getColor(value: string): string {
  const hash = createHash("shake256").update(value).digest("hex");

  return ROTA_SVG_PALETTE[parseInt(hash.slice(0, 8), 16) % ROTA_SVG_PALETTE.length] ?? RotaColors.BLUE;
}

export function toRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
