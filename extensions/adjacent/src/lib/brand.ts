/** Adjacent design-system tokens plus venue brand colors. */

export const INK = '#0a0f0d';
export const CANVAS = '#ece9e2';
export const CREAM = '#f5f2ea';
export const FOREST = '#0e2a1f';
export const MARK_INK = '#0e0e0c';
export const GREEN = '#3fae5a';
export const UP = '#2a6a3a';
export const DOWN = '#9b3a2e';
export const TREND_DOWN = '#c0392b';
export const MUSTARD = '#d89a3f';
export const MUTE = '#8e8e93';
export const RULE = '#d6d2c8';
export const FG2 = '#5c5a53';
export const FG3 = '#7f7d7a';

export const KALSHI = '#00B67A';
export const POLYMARKET = '#2E5CFF';

export function platformTint(platform?: string | null): string {
  if (platform === 'kalshi') return KALSHI;
  if (platform === 'polymarket') return POLYMARKET;
  return FG3;
}

export function platformLabel(platform?: string | null): string | undefined {
  if (platform === 'kalshi') return 'Kalshi';
  if (platform === 'polymarket') return 'Polymarket';
  return platform ?? undefined;
}

export function moveTint(n: number | null | undefined): string {
  if (n == null || n === 0) return FG3;
  return n > 0 ? GREEN : TREND_DOWN;
}

export function platformFromId(id: string): string | undefined {
  if (id.startsWith('kalshi:')) return 'kalshi';
  if (id.startsWith('polymarket:')) return 'polymarket';
  return undefined;
}
