/**
 * React hook for fetching a single FX rate with daily cache.
 *
 * Wraps the price-cache service's `getCachedFxRate` in a React-friendly
 * interface with loading states. Rates are cached at daily granularity —
 * repeated renders within the same day return instantly from cache.
 *
 * Returns a rate of 1.0 immediately when `from` and `to` are the same currency.
 * Skips fetching entirely when either currency is empty/undefined.
 *
 * Usage:
 * ```
 * const { rate, isLoading } = useFxRate("USD", "GBP");
 * // rate = 0.79 (or whatever today's rate is)
 * ```
 */

import { useCachedPromise } from "@raycast/utils";
import { getCachedFxRate, getCachedFxRateSync } from "../services/price-cache";

// ──────────────────────────────────────────
// Return Type
// ──────────────────────────────────────────

export interface UseFxRateReturn {
  /** The FX rate (from → to), or undefined while loading */
  rate: number | undefined;

  /** Whether a fetch is currently in progress */
  isLoading: boolean;
}

// ──────────────────────────────────────────
// Hook Implementation
// ──────────────────────────────────────────

/**
 * Fetches and caches the FX rate between two currencies.
 *
 * @param from - Source currency code (e.g. "USD"). Pass empty string or undefined to skip.
 * @param to   - Target currency code (e.g. "GBP"). Pass empty string or undefined to skip.
 * @returns The rate and loading state
 */
export function useFxRate(from: string | undefined, to: string | undefined): UseFxRateReturn {
  const shouldFetch = !!from && !!to && from.trim().length > 0 && to.trim().length > 0;
  const isSameCurrency = shouldFetch && from === to;

  const { data, isLoading } = useCachedPromise(
    async (f: string, t: string) => {
      const result = await getCachedFxRate(f, t);
      return result.rate;
    },
    [from ?? "", to ?? ""],
    {
      execute: shouldFetch && !isSameCurrency,
      keepPreviousData: true,
      initialData: (() => {
        if (isSameCurrency) return 1.0;
        if (!shouldFetch || !from || !to) return undefined;
        const cached = getCachedFxRateSync(from, to);
        return cached?.rate;
      })(),
    },
  );

  if (isSameCurrency) {
    return { rate: 1.0, isLoading: false };
  }

  return {
    rate: data,
    isLoading: shouldFetch ? isLoading : false,
  };
}
