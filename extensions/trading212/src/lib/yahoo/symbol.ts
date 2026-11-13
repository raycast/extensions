import type { T212Instrument } from "../t212/types";
import { majorCurrency } from "./chart";
import { YAHOO_TIMEOUT_MS, yahooJson } from "./http";

export interface YahooQuote {
  symbol: string;
  exchange?: string;
  quoteType?: string;
}

/** Raycast `LocalStorage` satisfies this. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
}

/** Yahoo symbol suffix for a Trading 212 ticker; "" for US, null when the venue is unknown. */
export function yahooSuffixForT212Ticker(t212Ticker: string): string | null {
  if (t212Ticker.endsWith("_US_EQ")) return "";
  if (/[A-Za-z0-9]l_EQ$/.test(t212Ticker)) return ".L";
  if (/[A-Za-z0-9]d_EQ$/.test(t212Ticker)) return ".DE";
  if (/[A-Za-z0-9]a_EQ$/.test(t212Ticker)) return ".AS";
  if (/[A-Za-z0-9]m_EQ$/.test(t212Ticker)) return ".MI";
  if (/[A-Za-z0-9]p_EQ$/.test(t212Ticker)) return ".PA";
  return null;
}

/** "VWCEd_EQ" → "VWCE.DE", "NVDA_US_EQ" → "NVDA"; null when the venue is unknown. */
export function derivedYahooSymbol(t212Ticker: string): string | null {
  const suffix = yahooSuffixForT212Ticker(t212Ticker);
  if (suffix === null) return null;
  const base = t212Ticker.split("_")[0];
  return (suffix === "" ? base : base.replace(/[a-z]$/, "")) + suffix;
}

function isListing(q: YahooQuote): boolean {
  return q.quoteType === "EQUITY" || q.quoteType === "ETF";
}

export function pickYahooSymbol(quotes: YahooQuote[], t212Ticker: string): string | null {
  const suffix = yahooSuffixForT212Ticker(t212Ticker);
  if (suffix === null) return quotes.find(isListing)?.symbol ?? null;
  if (suffix === "") {
    const dotless = quotes.filter((q) => !q.symbol.includes("."));
    return (dotless.find(isListing) ?? dotless[0])?.symbol ?? null;
  }
  return quotes.find((q) => q.symbol.toUpperCase().endsWith(suffix))?.symbol ?? null;
}

export async function searchYahooByIsin(
  isin: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = YAHOO_TIMEOUT_MS,
): Promise<YahooQuote[]> {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}&quotesCount=10&newsCount=0`;
  const json = (await yahooJson(url, fetchFn, timeoutMs)) as { quotes?: YahooQuote[] };
  return (json.quotes ?? []).filter((q) => typeof q?.symbol === "string");
}

/**
 * Yahoo's ISIN search usually returns a single listing (often London, in another currency), so the
 * symbol built from the Trading 212 ticker's own venue is tried first and kept when Yahoo lists it in
 * the instrument's currency. The ISIN search is the fallback.
 */
export async function resolveYahooSymbol(
  instrument: T212Instrument,
  deps: {
    search: (isin: string) => Promise<YahooQuote[]>;
    store: KeyValueStore;
    probe: (symbol: string) => Promise<string | null>;
  },
): Promise<string | null> {
  // v2: keyed by ticker (the venue matters); v1 entries keyed by ISIN held wrong-venue listings.
  const key = `yahoo-symbol:v2:${instrument.ticker}`;
  const cached = await deps.store.getItem(key);
  if (cached !== undefined) return cached === "" ? null : cached;
  const derived = derivedYahooSymbol(instrument.ticker);
  if (derived) {
    const currency = await deps.probe(derived);
    if (currency !== null && currency === majorCurrency(instrument.currency)) {
      await deps.store.setItem(key, derived);
      return derived;
    }
  }
  const symbol = pickYahooSymbol(await deps.search(instrument.isin), instrument.ticker);
  await deps.store.setItem(key, symbol ?? "");
  return symbol;
}
