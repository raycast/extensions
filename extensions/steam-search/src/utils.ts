import { Color } from "@raycast/api";
import { CURRENCY_SYMBOLS, CURRENCY_SUFFIX_REGIONS } from "./constants";

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

export function formatGGPrice(amount: number, region: string): string {
  const symbol = CURRENCY_SYMBOLS[region] ?? "$";
  const value = amount.toFixed(2);
  return CURRENCY_SUFFIX_REGIONS.has(region)
    ? `${value}${symbol}`
    : `${symbol}${value}`;
}

export function formatPlaytime(minutes: number): string {
  const hours = minutes / 60;
  if (hours < 0.1) return "0h";
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h`;
}
