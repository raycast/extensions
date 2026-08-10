import { Coins, Fetcher, SourceName } from "#/types";
import { fetchBinance } from "./binance";
import { fetchCoinGecko } from "./coingecko";
import { fetchOKX } from "./okx";
import { fetchCoinbase } from "./coinbase";
import { fetchKraken } from "./kraken";
import { makeCryptoCompare } from "./cryptocompare";

// Order shown in the Source preference dropdown.
export const sourceNames: SourceName[] = ["Binance", "CoinGecko", "OKX", "Coinbase", "Kraken", "CryptoCompare"];

// Default failover priority (broad coverage + reliable first). CryptoCompare is
// excluded here because it only works with an API key; it's appended last when keyed.
const DEFAULT_ORDER: SourceName[] = ["Binance", "CoinGecko", "OKX", "Coinbase", "Kraken"];

// Sources that quote in true fiat and therefore honor a non-USD currency preference.
const FIAT_SOURCES = new Set<SourceName>(["CoinGecko", "CryptoCompare"]);

export interface FetchResult {
  coins: Coins;
  /** Which source actually answered. */
  source: SourceName;
}

/**
 * Try sources in order until one returns prices. The preferred source goes first;
 * for non-USD currencies, true-fiat sources are prioritized so the currency is honored.
 * Throws only when every source fails.
 */
export async function fetchPrices(
  preferred: string,
  currency: string,
  symbols: string[],
  cryptoCompareApiKey?: string,
): Promise<FetchResult> {
  const fetchers: Record<SourceName, Fetcher | null> = {
    Binance: fetchBinance,
    CoinGecko: fetchCoinGecko,
    OKX: fetchOKX,
    Coinbase: fetchCoinbase,
    Kraken: fetchKraken,
    CryptoCompare: cryptoCompareApiKey ? makeCryptoCompare(cryptoCompareApiKey) : null,
  };

  const errors: string[] = [];
  for (const name of buildOrder(preferred as SourceName, currency)) {
    const fetcher = fetchers[name];
    if (!fetcher) continue; // CryptoCompare without an API key
    try {
      const coins = await fetcher(currency, symbols);
      if (Object.keys(coins).length > 0) {
        return { coins, source: name };
      }
      errors.push(`${name}: empty`);
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`All price sources failed — ${errors.join(" | ")}`);
}

function buildOrder(preferred: SourceName, currency: string): SourceName[] {
  const base: SourceName[] = [preferred, ...DEFAULT_ORDER.filter((n) => n !== preferred)];
  const ordered: SourceName[] = base.includes("CryptoCompare") ? base : [...base, "CryptoCompare"];
  if (currency.toUpperCase() === "USD") return ordered;
  // Non-USD: put true-fiat sources first so the currency is honored; USD-only sources
  // stay as last-resort fallback (their prices are labeled honestly as USD).
  return [...ordered.filter((n) => FIAT_SOURCES.has(n)), ...ordered.filter((n) => !FIAT_SOURCES.has(n))];
}
