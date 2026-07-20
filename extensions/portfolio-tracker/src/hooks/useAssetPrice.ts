/**
 * React hook for fetching a single asset's price with daily cache.
 *
 * Wraps the price-cache service in a React-friendly interface with
 * loading states and error handling. Prices are cached at daily
 * granularity — repeated renders within the same day will return
 * instantly from the cache without any API call.
 *
 * Features:
 * - Automatic daily caching (via price-cache service)
 * - Loading and error state management
 * - Stale data fallback when offline
 * - Manual refresh capability
 * - Sync access to cached data for instant initial render
 *
 * Usage:
 * ```
 * const { price, isLoading, error, refresh } = useAssetPrice("VUSA.L");
 * ```
 */

import { useCachedPromise } from "@raycast/utils";
import { CachedPrice, PortfolioError } from "../utils/types";
import { getCachedPrice, getCachedPriceSync } from "../services/price-cache";
import { createPortfolioError } from "../utils/errors";

// ──────────────────────────────────────────
// Return Type
// ──────────────────────────────────────────

export interface UseAssetPriceReturn {
  /** The cached or freshly-fetched price data, or undefined while loading */
  price: CachedPrice | undefined;

  /** Whether a fetch is currently in progress */
  isLoading: boolean;

  /** The most recent error, or undefined if the last fetch succeeded */
  error: PortfolioError | undefined;

  /** Manually trigger a re-fetch (bypasses the in-memory cache of useCachedPromise) */
  refresh: () => void;
}

// ──────────────────────────────────────────
// Hook Implementation
// ──────────────────────────────────────────

/**
 * Fetches and caches the current price for a single Yahoo Finance symbol.
 *
 * On first call of the day: fetches from Yahoo Finance, caches, and returns.
 * On subsequent calls the same day: returns from Raycast's disk cache instantly.
 *
 * If the API call fails and a stale cached entry exists (up to 7 days old),
 * that stale data is returned instead of throwing. This provides graceful
 * degradation when the user is offline.
 *
 * @param symbol - Yahoo Finance symbol (e.g. "VUSA.L", "AAPL"). Pass empty string or undefined to skip.
 * @returns Price data, loading state, error, and refresh function
 *
 * @example
 * function PriceDisplay({ symbol }: { symbol: string }) {
 *   const { price, isLoading, error } = useAssetPrice(symbol);
 *
 *   if (isLoading) return <Detail isLoading />;
 *   if (error) return <Detail markdown={`Error: ${error.message}`} />;
 *   if (!price) return <Detail markdown="No price data" />;
 *
 *   return <Detail markdown={`**${price.name}**: ${price.currency} ${price.price}`} />;
 * }
 */
export function useAssetPrice(symbol: string | undefined): UseAssetPriceReturn {
  const shouldFetch = !!symbol && symbol.trim().length > 0;

  const {
    data: price,
    isLoading,
    error: rawError,
    revalidate,
  } = useCachedPromise(
    async (sym: string) => {
      return await getCachedPrice(sym);
    },
    [symbol ?? ""],
    {
      execute: shouldFetch,
      keepPreviousData: true,
      // Provide instant initial data from the sync cache if available.
      // This means the UI renders with data immediately on cache hit,
      // without waiting for the async path.
      initialData: shouldFetch && symbol ? getCachedPriceSync(symbol) : undefined,
    },
  );

  // Convert raw error to our structured PortfolioError type
  const error: PortfolioError | undefined = rawError ? createPortfolioError(rawError, symbol) : undefined;

  return {
    price,
    isLoading: shouldFetch ? isLoading : false,
    error,
    refresh: revalidate,
  };
}

// ──────────────────────────────────────────
// Multi-Asset Variant
// ──────────────────────────────────────────

export interface UseAssetPricesReturn {
  /** Map of symbol → CachedPrice for all successfully fetched prices */
  prices: Map<string, CachedPrice>;

  /** Whether any fetches are currently in progress */
  isLoading: boolean;

  /** Array of errors for symbols that failed to fetch */
  errors: PortfolioError[];

  /** Manually trigger a re-fetch of all symbols */
  refresh: () => void;
}

/**
 * Fetches and caches prices for multiple symbols.
 *
 * Uses `getCachedPrices` from the price-cache service, which:
 * 1. Returns cached entries instantly for symbols already fetched today
 * 2. Fetches uncached symbols in parallel from Yahoo Finance
 * 3. Stores new fetches in the daily cache
 *
 * This is the primary hook used by `usePortfolioValue` to get prices
 * for all positions in the portfolio in a single batch.
 *
 * @param symbols - Array of Yahoo Finance symbols. Pass empty array to skip.
 * @returns Prices map, loading state, errors, and refresh function
 *
 * @example
 * const { prices, isLoading } = useAssetPrices(["VUSA.L", "AAPL", "MSFT"]);
 * const vusaPrice = prices.get("VUSA.L");
 */
export function useAssetPrices(symbols: string[]): UseAssetPricesReturn {
  const shouldFetch = symbols.length > 0;

  // We import dynamically to avoid circular deps at module level.
  // The price-cache module's getCachedPrices handles batch fetching.
  const {
    data,
    isLoading,
    error: rawError,
    revalidate,
  } = useCachedPromise(
    async (syms: string[]) => {
      const { getCachedPrices } = await import("../services/price-cache");
      const result = await getCachedPrices(syms);

      // Convert Map to a serialisable object for useCachedPromise's cache,
      // then reconstruct it. This is needed because Map doesn't serialise to JSON.
      return {
        entries: Array.from(result.prices.entries()),
        errors: result.errors.map(({ symbol, error }) => ({
          symbol,
          error: createPortfolioError(error, symbol),
        })),
      };
    },
    [symbols],
    {
      execute: shouldFetch,
      keepPreviousData: true,
    },
  );

  // Reconstruct the Map from the serialised entries
  const prices = new Map<string, CachedPrice>(data?.entries ?? []);

  // Collect all errors (from batch fetch + any top-level error)
  const errors: PortfolioError[] = [];
  if (data?.errors) {
    for (const { error } of data.errors) {
      errors.push(error);
    }
  }
  if (rawError) {
    errors.push(createPortfolioError(rawError));
  }

  return {
    prices,
    isLoading: shouldFetch ? isLoading : false,
    errors,
    refresh: revalidate,
  };
}
