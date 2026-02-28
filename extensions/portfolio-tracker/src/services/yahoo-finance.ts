/**
 * Yahoo Finance API client.
 *
 * Single responsibility: communicate with Yahoo Finance via the `yahoo-finance2` package.
 * All other modules consume this — never import yahoo-finance2 directly elsewhere.
 *
 * This module provides three core operations:
 * 1. `searchAssets()` — Type-ahead search for securities by name, ticker, or ISIN
 * 2. `getQuote()` — Current price quote for a single symbol
 * 3. `getQuotes()` — Batch price quotes for multiple symbols
 * 4. `getFxRate()` — Exchange rate between two currencies
 *
 * All functions normalise Yahoo Finance's raw responses into our domain types
 * (see `utils/types.ts`). Minor currency handling (e.g. GBp → GBP) is applied
 * automatically via `normaliseCurrencyPrice()`.
 */

import YahooFinance from "yahoo-finance2";
import { AssetSearchResult, AssetQuote, AssetType } from "../utils/types";
import { normaliseCurrencyPrice } from "../utils/formatting";
import { SEARCH_MAX_RESULTS } from "../utils/constants";

// ──────────────────────────────────────────
// Singleton Yahoo Finance Instance
// ──────────────────────────────────────────

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ──────────────────────────────────────────
// Search
// ──────────────────────────────────────────

/**
 * Searches for securities matching the given query string.
 *
 * Filters out non-financial results and maps to our `AssetSearchResult` type.
 * Results are capped at `SEARCH_MAX_RESULTS` to keep the UI snappy.
 *
 * @param query - Free-text search (e.g. "S&P 500", "AAPL", "Vanguard")
 * @returns Array of matching securities
 *
 * @example
 * const results = await searchAssets("S&P 500");
 * // [{ symbol: "VUSA.L", name: "Vanguard S&P 500 UCITS ETF", type: AssetType.ETF, exchange: "LSE" }, ...]
 */
export async function searchAssets(query: string): Promise<AssetSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const response = await yf.search(query, {
    quotesCount: SEARCH_MAX_RESULTS,
    newsCount: 0,
  });

  const quotes = (response.quotes ?? []) as Array<Record<string, unknown>>;

  return quotes
    .filter((q) => {
      // yahoo-finance2 v3 search results have a `symbol` property
      // Filter out results without a symbol or that aren't financial instruments
      return q.symbol && typeof q.symbol === "string" && (q.symbol as string).length > 0;
    })
    .slice(0, SEARCH_MAX_RESULTS)
    .map((q) => ({
      symbol: q.symbol as string,
      name: extractSearchName(q),
      type: mapQuoteType(q.quoteType as string | undefined),
      exchange: (q.exchange as string) ?? "Unknown",
    }));
}

// ──────────────────────────────────────────
// Quote (Single)
// ──────────────────────────────────────────

/**
 * Fetches the current price quote for a single symbol.
 *
 * Uses `quoteSummary` with the `price` module instead of the `quote` endpoint
 * to bypass Yahoo Finance's broken consent/crumb flow (the `quote` endpoint
 * requires a crumb obtained via cookie consent which fails in non-browser
 * environments — see yahoo-finance2 issue #741).
 *
 * Handles minor currency normalisation (e.g. GBp → GBP) automatically.
 *
 * @param symbol - Yahoo Finance symbol (e.g. "VUSA.L", "AAPL", "MSFT")
 * @returns Current quote with price, change, and metadata
 * @throws Error if the symbol is invalid or the API call fails
 *
 * @example
 * const quote = await getQuote("VUSA.L");
 * // { symbol: "VUSA.L", name: "Vanguard S&P 500 UCITS ETF", price: 72.45, currency: "GBP", ... }
 */
export async function getQuote(symbol: string): Promise<AssetQuote> {
  const summary = await yf.quoteSummary(symbol, { modules: ["price"] });
  const q = summary.price;

  if (!q || q.regularMarketPrice === undefined || q.regularMarketPrice === null) {
    throw new Error(`No price data available for symbol: ${symbol}`);
  }

  const rawPrice = q.regularMarketPrice;
  const rawCurrency = q.currency ?? "USD";
  const normalised = normaliseCurrencyPrice(rawPrice, rawCurrency);

  // Normalise change values too if in minor currency
  const rawChange = q.regularMarketChange ?? 0;
  const normalisedChange = normaliseCurrencyPrice(rawChange, rawCurrency);

  return {
    symbol: q.symbol ?? symbol,
    name: q.shortName ?? q.longName ?? symbol,
    price: normalised.price,
    currency: normalised.currency,
    change: normalisedChange.price,
    changePercent: (q.regularMarketChangePercent ?? 0) * 100,
    marketState: q.marketState ?? "CLOSED",
  };
}

// ──────────────────────────────────────────
// Quote (Batch)
// ──────────────────────────────────────────

/**
 * Fetches current price quotes for multiple symbols.
 *
 * Calls `getQuote()` for each symbol in parallel. If an individual symbol
 * fails, it is excluded from the results (errors are collected separately).
 *
 * @param symbols - Array of Yahoo Finance symbols
 * @returns Object with successful quotes and any errors encountered
 *
 * @example
 * const { quotes, errors } = await getQuotes(["VUSA.L", "AAPL", "INVALID"]);
 * // quotes: [AssetQuote, AssetQuote]
 * // errors: [{ symbol: "INVALID", error: Error }]
 */
export async function getQuotes(
  symbols: string[],
): Promise<{ quotes: AssetQuote[]; errors: Array<{ symbol: string; error: unknown }> }> {
  if (symbols.length === 0) {
    return { quotes: [], errors: [] };
  }

  const results = await Promise.allSettled(symbols.map((s) => getQuote(s)));

  const quotes: AssetQuote[] = [];
  const errors: Array<{ symbol: string; error: unknown }> = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      quotes.push(result.value);
    } else {
      errors.push({ symbol: symbols[index], error: result.reason });
    }
  });

  return { quotes, errors };
}

// ──────────────────────────────────────────
// FX Rate
// ──────────────────────────────────────────

/**
 * Fetches the exchange rate to convert from one currency to another.
 *
 * Uses Yahoo Finance currency pair symbols (e.g. "USDGBP=X").
 * Returns 1.0 if `from` and `to` are the same currency.
 *
 * @param from - Source currency code (e.g. "USD")
 * @param to - Target currency code (e.g. "GBP")
 * @returns Exchange rate (1 unit of `from` = rate units of `to`)
 * @throws Error if the FX rate cannot be fetched
 *
 * @example
 * const rate = await getFxRate("USD", "GBP");
 * // 0.79 (meaning 1 USD = 0.79 GBP)
 */
export async function getFxRate(from: string, to: string): Promise<number> {
  // Same currency — no conversion needed
  if (from === to) {
    return 1.0;
  }

  const symbol = `${from}${to}=X`;

  const summary = await yf.quoteSummary(symbol, { modules: ["price"] });
  const q = summary.price;

  if (!q || q.regularMarketPrice === undefined || q.regularMarketPrice === null) {
    throw new Error(`No FX rate data available for ${from}→${to} (symbol: ${symbol})`);
  }

  return q.regularMarketPrice;
}

// ──────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────

/**
 * Extracts a human-readable name from a Yahoo Finance search result.
 * Tries shortname first, then longname, then falls back to the symbol.
 */
function extractSearchName(q: Record<string, unknown>): string {
  if (typeof q.shortname === "string" && q.shortname.length > 0) {
    return q.shortname;
  }
  if (typeof q.longname === "string" && q.longname.length > 0) {
    return q.longname;
  }
  if (typeof q.shortName === "string" && q.shortName.length > 0) {
    return q.shortName;
  }
  if (typeof q.longName === "string" && q.longName.length > 0) {
    return q.longName;
  }
  return String(q.symbol ?? "Unknown");
}

/**
 * Maps Yahoo Finance's `quoteType` string to our `AssetType` enum.
 *
 * Yahoo Finance returns strings like "EQUITY", "ETF", "MUTUALFUND".
 * We map these to our enum, with a fallback to `AssetType.UNKNOWN`.
 */
function mapQuoteType(quoteType: string | undefined | null): AssetType {
  if (!quoteType) {
    return AssetType.UNKNOWN;
  }

  const upper = quoteType.toUpperCase();

  const mapping: Record<string, AssetType> = {
    EQUITY: AssetType.EQUITY,
    ETF: AssetType.ETF,
    MUTUALFUND: AssetType.MUTUALFUND,
    INDEX: AssetType.INDEX,
    CURRENCY: AssetType.CURRENCY,
    CRYPTOCURRENCY: AssetType.CRYPTOCURRENCY,
    OPTION: AssetType.OPTION,
    FUTURE: AssetType.FUTURE,
  };

  return mapping[upper] ?? AssetType.UNKNOWN;
}
