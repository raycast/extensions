import { LocalStorage } from "@raycast/api";
import { assetFromId } from "../market-ids";
import { Quote, SearchResult } from "../market-types";
import {
  fetchBinancePerpQuote,
  fetchBinanceQuote,
  searchBinance,
  searchBinancePerp,
} from "./binance";
import {
  fetchCryptoQuote,
  fetchTrendingCrypto,
  searchCrypto,
} from "./coingecko";
import { fetchTokenQuote, searchTokens } from "./dexscreener";
import { fetchPolymarketQuote, searchPolymarket } from "./polymarket";
import { fetchStockQuote, fetchTrendingStocks, searchStocks } from "./yahoo";

const POPULAR_CACHE_KEY = "popular.v1";

export async function fetchQuote(id: string): Promise<Quote | undefined> {
  const asset = assetFromId(id);
  if (!asset) return undefined;

  switch (asset.kind) {
    case "stock":
      return fetchStockQuote(asset);
    case "crypto":
      return fetchCryptoQuote(asset);
    case "token":
      return fetchTokenQuote(asset);
    case "polymarket":
      return fetchPolymarketQuote(asset);
    case "binance":
      return fetchBinanceQuote(asset);
    case "binanceperp":
      return fetchBinancePerpQuote(asset);
    default: {
      const exhaustive: never = asset.kind;
      return exhaustive;
    }
  }
}

export async function searchMarkets(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const searches = [
    searchCrypto(normalized, signal),
    searchTokens(normalized, signal),
    searchPolymarket(normalized, signal),
  ];
  if (/^[A-Z.]{1,8}$/i.test(normalized)) {
    searches.push(
      searchStocks(normalized, signal),
      searchBinance(normalized),
      searchBinancePerp(normalized),
    );
  }

  const settled = await Promise.allSettled(searches);
  return settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .slice(0, 40);
}

// Cache the last good live trending feed so Browse Markets remains useful
// when Yahoo or CoinGecko is temporarily rate-limited or offline.
export async function popularMarkets(): Promise<SearchResult[]> {
  const [stocks, crypto] = await Promise.allSettled([
    fetchTrendingStocks(),
    fetchTrendingCrypto(),
  ]);
  const combined = [
    ...(stocks.status === "fulfilled" ? stocks.value : []),
    ...(crypto.status === "fulfilled" ? crypto.value : []),
  ];

  if (combined.length) {
    await LocalStorage.setItem(POPULAR_CACHE_KEY, JSON.stringify(combined));
    return combined;
  }

  const cached = await LocalStorage.getItem<string>(POPULAR_CACHE_KEY);
  if (!cached) return [];
  try {
    return JSON.parse(cached) as SearchResult[];
  } catch {
    return [];
  }
}
