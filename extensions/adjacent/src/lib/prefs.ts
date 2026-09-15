import { getPreferenceValues } from '@raycast/api';

export type Timeframe = '15m' | '30m' | '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d';

export const TIMEFRAMES: Timeframe[] = ['15m', '30m', '1h', '6h', '12h', '24h', '7d', '30d', '90d'];

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function apiKey(): string | undefined {
  const key = prefs().apiKey?.trim();
  return key || undefined;
}

export function hasApiKey(): boolean {
  return Boolean(apiKey());
}

export function defaultTimeframe(): Timeframe {
  const value = prefs().defaultTimeframe;
  return TIMEFRAMES.includes(value as Timeframe) ? (value as Timeframe) : '30d';
}

/** Menu bar rotate interval in ms. 0 means pin the first index. */
export function cycleMs(): number {
  const raw = Number(prefs().cycleSeconds);
  if (!Number.isFinite(raw) || raw < 0) return 15_000;
  return Math.round(raw * 1000);
}

/** Map a human window to the REST interval + page size. Short windows need a key. */
export function timeframeQuery(
  timeframe: Timeframe,
  authed: boolean,
): { interval: '1min' | '5min' | '1hour' | '1d'; per_page: number } {
  switch (timeframe) {
    case '15m':
      return authed ? { interval: '1min', per_page: 15 } : { interval: '1hour', per_page: 2 };
    case '30m':
      return authed ? { interval: '1min', per_page: 30 } : { interval: '1hour', per_page: 2 };
    case '1h':
      return authed ? { interval: '1min', per_page: 60 } : { interval: '1hour', per_page: 2 };
    case '6h':
      return authed ? { interval: '5min', per_page: 72 } : { interval: '1hour', per_page: 6 };
    case '12h':
      return authed ? { interval: '5min', per_page: 144 } : { interval: '1hour', per_page: 12 };
    case '24h':
      return { interval: '1hour', per_page: 24 };
    case '7d':
      return { interval: '1d', per_page: 7 };
    case '30d':
      return { interval: '1d', per_page: 30 };
    case '90d':
      return { interval: '1d', per_page: 90 };
  }
}
