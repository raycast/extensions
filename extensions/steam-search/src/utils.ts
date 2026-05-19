import { Color } from "@raycast/api";

export function getRatingColor(pct: number): Color {
  if (pct >= 80) return Color.Green;
  if (pct >= 60) return Color.Yellow;
  return Color.Red;
}

export function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
}