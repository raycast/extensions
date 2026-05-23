import type { Application } from "@raycast/api";

export interface Preferences {
  browser?: Application;
  openDelayMs: string;
  openAnyUriType: boolean;
  confirmEnabled: boolean;
  confirmThreshold: string;
}

export interface ResolvedPrefs {
  browser?: Application;
  delayMs: number;
  openAnyUriType: boolean;
  confirmEnabled: boolean;
  confirmThreshold: number;
}

export function resolvePreferences(raw: Preferences): ResolvedPrefs {
  return {
    browser: raw.browser,
    delayMs: coerceNumber(raw.openDelayMs, 50, 0),
    openAnyUriType: raw.openAnyUriType,
    confirmEnabled: raw.confirmEnabled,
    confirmThreshold: coerceNumber(raw.confirmThreshold, 10, 1),
  };
}

export function coerceNumber(input: string, fallback: number, floor: number): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n < floor) return fallback;
  return Math.floor(n);
}
