/**
 * Price cache service.
 *
 * Wraps Raycast's Cache API to provide daily-granularity caching for:
 * 1. Asset price quotes (keyed by symbol + date)
 * 2. FX exchange rates (keyed by currency pair + date)
 *
 * Cache strategy:
 * - Each entry is keyed with today's date, so stale data auto-expires
 *   when the date rolls over (no manual invalidation needed).
 * - On cache hit: return immediately (sync, no API call).
 * - On cache miss: fetch from Yahoo Finance, store in cache, return.
 * - On API failure with existing (stale) cache: return stale data with a flag.
 *
 * This ensures each symbol is fetched at most once per calendar day,
 * dramatically reducing API calls and speeding up the plugin.
 */

import { Cache } from "@raycast/api";
import { CachedPrice, CachedFxRate } from "../utils/types";
import { CACHE_PREFIX, CACHE_CAPACITY_BYTES } from "../utils/constants";
import { getTodayDateKey } from "../utils/formatting";
import { getQuote, getFxRate } from "./yahoo-finance";
import { createPortfolioError } from "../utils/errors";

// ──────────────────────────────────────────
// Cache Instance (shared across commands)
// ──────────────────────────────────────────

const cache = new Cache({ capacity: CACHE_CAPACITY_BYTES });

// ──────────────────────────────────────────
// Cache Key Builders
// ──────────────────────────────────────────

/**
 * Builds a cache key for a price entry.
 *
 * @param symbol - Yahoo Finance symbol, e.g. "VUSA.L"
 * @param dateKey - Date string in "YYYY-MM-DD" format
 * @returns Cache key, e.g. "price:VUSA.L:2025-07-15"
 */
function priceKey(symbol: string, dateKey: string): string {
  return `${CACHE_PREFIX.PRICE}:${symbol}:${dateKey}`;
}

/**
 * Builds a cache key for an FX rate entry.
 *
 * @param from - Source currency code, e.g. "USD"
 * @param to - Target currency code, e.g. "GBP"
 * @param dateKey - Date string in "YYYY-MM-DD" format
 * @returns Cache key, e.g. "fx:USD:GBP:2025-07-15"
 */
function fxKey(from: string, to: string, dateKey: string): string {
  return `${CACHE_PREFIX.FX_RATE}:${from}:${to}:${dateKey}`;
}

// ──────────────────────────────────────────
// Price Cache Operations
// ──────────────────────────────────────────

/**
 * Retrieves the cached price for a symbol, or fetches it from the API.
 *
 * Flow:
 * 1. Check cache for today's entry → return if found (instant, no API call)
 * 2. Cache miss → call Yahoo Finance API
 * 3. On success → store in cache and return
 * 4. On failure → try to find a stale entry from a previous day
 * 5. If stale entry found → return it (marked as stale)
 * 6. If no stale entry → throw the original error
 *
 * @param symbol - Yahoo Finance symbol (e.g. "VUSA.L", "AAPL")
 * @returns Cached or freshly fetched price data
 * @throws PortfolioError if the API fails and no cached fallback exists
 */
export async function getCachedPrice(symbol: string): Promise<CachedPrice> {
  const today = getTodayDateKey();
  const key = priceKey(symbol, today);

  // 1. Check today's cache
  const cached = cache.get(key);
  if (cached) {
    return JSON.parse(cached) as CachedPrice;
  }

  // 2. Cache miss — fetch from API
  try {
    const quote = await getQuote(symbol);
    const entry: CachedPrice = {
      symbol: quote.symbol,
      price: quote.price,
      currency: quote.currency,
      name: quote.name,
      change: quote.change,
      changePercent: quote.changePercent,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(key, JSON.stringify(entry));
    return entry;
  } catch (error) {
    // 4. API failed — try to find stale data from recent days
    const stale = findStalePrice(symbol);
    if (stale) {
      return stale;
    }

    // 6. No fallback — propagate the error
    throw createPortfolioError(error, symbol);
  }
}

/**
 * Retrieves a price from cache only (no API call).
 * Returns undefined if no cached entry exists for today.
 *
 * Useful for synchronous rendering when you want to show cached data
 * while a background refresh is in progress.
 *
 * @param symbol - Yahoo Finance symbol
 * @returns Cached price or undefined
 */
export function getCachedPriceSync(symbol: string): CachedPrice | undefined {
  const today = getTodayDateKey();
  const key = priceKey(symbol, today);
  const cached = cache.get(key);
  return cached ? (JSON.parse(cached) as CachedPrice) : undefined;
}

/**
 * Searches for a stale (previous day's) cached price for a symbol.
 * Checks the last 7 days in reverse order.
 *
 * @param symbol - Yahoo Finance symbol
 * @returns The most recent stale cache entry, or undefined if none found
 */
function findStalePrice(symbol: string): CachedPrice | undefined {
  for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateKey = date.toISOString().split("T")[0];
    const key = priceKey(symbol, dateKey);
    const cached = cache.get(key);
    if (cached) {
      return JSON.parse(cached) as CachedPrice;
    }
  }
  return undefined;
}

// ──────────────────────────────────────────
// FX Rate Cache Operations
// ──────────────────────────────────────────

/**
 * Retrieves the cached FX rate for a currency pair, or fetches it from the API.
 *
 * Returns 1.0 immediately if `from` and `to` are the same currency.
 *
 * Same fallback logic as `getCachedPrice()`: on API failure, tries stale data
 * from the previous 7 days.
 *
 * @param from - Source currency code (e.g. "USD")
 * @param to - Target currency code (e.g. "GBP")
 * @returns Cached or freshly fetched FX rate entry
 * @throws PortfolioError if the API fails and no cached fallback exists
 */
export async function getCachedFxRate(from: string, to: string): Promise<CachedFxRate> {
  // Same currency — instant return, no cache needed
  if (from === to) {
    return {
      from,
      to,
      rate: 1.0,
      fetchedAt: new Date().toISOString(),
    };
  }

  const today = getTodayDateKey();
  const key = fxKey(from, to, today);

  // Check today's cache
  const cached = cache.get(key);
  if (cached) {
    return JSON.parse(cached) as CachedFxRate;
  }

  // Cache miss — fetch from API
  try {
    const rate = await getFxRate(from, to);
    const entry: CachedFxRate = {
      from,
      to,
      rate,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(key, JSON.stringify(entry));
    return entry;
  } catch (error) {
    // Try stale data
    const stale = findStaleFxRate(from, to);
    if (stale) {
      return stale;
    }

    throw createPortfolioError(error);
  }
}

/**
 * Retrieves an FX rate from cache only (no API call).
 * Returns undefined if no cached entry exists for today.
 *
 * @param from - Source currency code
 * @param to - Target currency code
 * @returns Cached FX rate or undefined
 */
export function getCachedFxRateSync(from: string, to: string): CachedFxRate | undefined {
  if (from === to) {
    return { from, to, rate: 1.0, fetchedAt: new Date().toISOString() };
  }

  const today = getTodayDateKey();
  const key = fxKey(from, to, today);
  const cached = cache.get(key);
  return cached ? (JSON.parse(cached) as CachedFxRate) : undefined;
}

/**
 * Searches for a stale (previous day's) cached FX rate.
 * Checks the last 7 days in reverse order.
 *
 * @param from - Source currency code
 * @param to - Target currency code
 * @returns The most recent stale cache entry, or undefined
 */
function findStaleFxRate(from: string, to: string): CachedFxRate | undefined {
  for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateKey = date.toISOString().split("T")[0];
    const key = fxKey(from, to, dateKey);
    const cached = cache.get(key);
    if (cached) {
      return JSON.parse(cached) as CachedFxRate;
    }
  }
  return undefined;
}

// ──────────────────────────────────────────
// Batch Operations
// ──────────────────────────────────────────

/**
 * Fetches prices for multiple symbols, using the cache where possible.
 *
 * For each symbol:
 * - If cached today → uses cache (no API call)
 * - If not cached → fetches from API and caches
 *
 * Returns all successful results and any errors encountered.
 *
 * @param symbols - Array of Yahoo Finance symbols
 * @returns Object with prices map (symbol → CachedPrice) and any errors
 */
export async function getCachedPrices(
  symbols: string[],
): Promise<{ prices: Map<string, CachedPrice>; errors: Array<{ symbol: string; error: unknown }> }> {
  const prices = new Map<string, CachedPrice>();
  const errors: Array<{ symbol: string; error: unknown }> = [];

  // Separate cached vs uncached symbols
  const uncachedSymbols: string[] = [];

  for (const symbol of symbols) {
    const cached = getCachedPriceSync(symbol);
    if (cached) {
      prices.set(symbol, cached);
    } else {
      uncachedSymbols.push(symbol);
    }
  }

  // Fetch uncached symbols in parallel
  if (uncachedSymbols.length > 0) {
    const results = await Promise.allSettled(uncachedSymbols.map((s) => getCachedPrice(s)));

    results.forEach((result, index) => {
      const symbol = uncachedSymbols[index];
      if (result.status === "fulfilled") {
        prices.set(symbol, result.value);
      } else {
        errors.push({ symbol, error: result.reason });
      }
    });
  }

  return { prices, errors };
}

/**
 * Fetches FX rates for multiple currency pairs, using the cache where possible.
 *
 * Deduplicates pairs (e.g. if multiple positions are in USD, only one FX call is made).
 *
 * @param pairs - Array of { from, to } currency pairs
 * @param baseCurrency - The target currency for all conversions
 * @returns Map of "FROM" → CachedFxRate
 */
export async function getCachedFxRates(currencies: string[], baseCurrency: string): Promise<Map<string, CachedFxRate>> {
  const rates = new Map<string, CachedFxRate>();

  // Deduplicate currencies
  const uniqueCurrencies = [...new Set(currencies)];

  const results = await Promise.allSettled(uniqueCurrencies.map((currency) => getCachedFxRate(currency, baseCurrency)));

  results.forEach((result, index) => {
    const currency = uniqueCurrencies[index];
    if (result.status === "fulfilled") {
      rates.set(currency, result.value);
    } else {
      // FX rate failure — default to 1.0 to avoid breaking the whole portfolio
      // The error will be visible as incorrect totals, but the app won't crash
      console.error(`Failed to fetch FX rate for ${currency}→${baseCurrency}:`, result.reason);
      rates.set(currency, {
        from: currency,
        to: baseCurrency,
        rate: 1.0,
        fetchedAt: new Date().toISOString(),
      });
    }
  });

  return rates;
}

// ──────────────────────────────────────────
// Cache Management
// ──────────────────────────────────────────

/**
 * Clears all cached price and FX data.
 * Useful for a manual "refresh all" action.
 */
export function clearPriceCache(): void {
  cache.clear();
}

/**
 * Checks whether the cache has a fresh (today's) price for a symbol.
 *
 * @param symbol - Yahoo Finance symbol
 * @returns true if today's price is cached
 */
export function hasTodaysPrice(symbol: string): boolean {
  const today = getTodayDateKey();
  return cache.has(priceKey(symbol, today));
}
