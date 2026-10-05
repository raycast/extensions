import { getPreferenceValues } from "@raycast/api";
import { createMicroBatcher } from "../market-batch";
import { formatPrice, titleCase } from "../market-format";
import { fetchJson } from "../market-http";
import { binancePairBase } from "../market-ids";
import { Asset, Quote, SearchResult } from "../market-types";
import { BinanceSnapshot, fetchBinanceTicker } from "./binance";
import { finiteNumber, httpsImageUrl } from "./shared";

type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h?: number;
  high_24h?: number;
  low_24h?: number;
  total_volume?: number;
  market_cap?: number;
  image?: string;
};

type CoinGeckoTrending = {
  coins?: {
    item: {
      id: string;
      name: string;
      symbol: string;
      thumb?: string;
      small?: string;
      large?: string;
    };
  }[];
};

const COINGECKO_TO_BINANCE: Record<string, string> = {
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  solana: "SOLUSDT",
  ripple: "XRPUSDT",
  cardano: "ADAUSDT",
  dogecoin: "DOGEUSDT",
  "avalanche-2": "AVAXUSDT",
  chainlink: "LINKUSDT",
  polkadot: "DOTUSDT",
  litecoin: "LTCUSDT",
  "matic-network": "MATICUSDT",
  tron: "TRXUSDT",
  "shiba-inu": "SHIBUSDT",
  uniswap: "UNIUSDT",
  "near-protocol": "NEARUSDT",
  aptos: "APTUSDT",
  "internet-computer": "ICPUSDT",
  injective: "INJUSDT",
  sui: "SUIUSDT",
  "the-open-network": "TONUSDT",
  hyperliquid: "HYPEUSDT",
};

const loadCoinGeckoMarkets = createMicroBatcher<string, CoinGeckoMarket>(
  async (keys) => {
    const groups = new Map<string, string[]>();
    for (const key of keys) {
      const separator = key.indexOf(":");
      const currency = key.slice(0, separator);
      const id = key.slice(separator + 1);
      groups.set(currency, [...(groups.get(currency) ?? []), id]);
    }

    const entries = await Promise.all(
      [...groups.entries()].map(async ([currency, ids]) => {
        const coins = await fetchJson<CoinGeckoMarket[]>(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(currency)}&ids=${encodeURIComponent(ids.join(","))}&price_change_percentage=24h`,
        );
        return coins.map((coin) => [`${currency}:${coin.id}`, coin] as const);
      }),
    );
    return new Map(entries.flat());
  },
);

export async function fetchCryptoQuote(
  asset: Asset,
): Promise<Quote | undefined> {
  const currency = getPreferenceValues<Preferences>().currency;
  let coin: CoinGeckoMarket | undefined;

  if (currency.toLowerCase() === "usd") {
    const binanceSymbol = COINGECKO_TO_BINANCE[asset.query];
    if (binanceSymbol) {
      const [ticker, coinGeckoMarket] = await Promise.all([
        fetchBinanceTicker(binanceSymbol).catch(
          () => undefined as BinanceSnapshot | undefined,
        ),
        loadCoinGeckoMarkets(`${currency}:${asset.query}`).catch(
          () => undefined,
        ),
      ]);
      coin = coinGeckoMarket;
      if (ticker) {
        return {
          id: asset.id,
          kind: asset.kind,
          symbol: binancePairBase(binanceSymbol),
          name: coin?.name ?? titleCase(asset.name || asset.query),
          price: ticker.price,
          priceLabel: formatPrice(ticker.price, "usd"),
          changePercent: ticker.changePercent,
          provider: "Binance",
          asOf: new Date().toISOString(),
          url: `https://www.coingecko.com/en/coins/${asset.query}`,
          open: ticker.open,
          high: ticker.high,
          low: ticker.low,
          volume: ticker.volume,
          marketCap: finiteNumber(coin?.market_cap),
          imageUrl: httpsImageUrl(coin?.image),
        };
      }
    }
  }

  coin ??= await loadCoinGeckoMarkets(`${currency}:${asset.query}`);
  const price = Number(coin?.current_price);
  if (!coin || !Number.isFinite(price)) return undefined;
  return {
    id: asset.id,
    kind: asset.kind,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    price,
    priceLabel: formatPrice(price, currency),
    changePercent: coin.price_change_percentage_24h,
    provider: asset.provider,
    asOf: new Date().toISOString(),
    url: `https://www.coingecko.com/en/coins/${asset.query}`,
    high: finiteNumber(coin.high_24h),
    low: finiteNumber(coin.low_24h),
    volume: finiteNumber(coin.total_volume),
    marketCap: finiteNumber(coin.market_cap),
    imageUrl: httpsImageUrl(coin.image),
  };
}

export async function searchCrypto(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const json = await fetchJson<{
    coins?: {
      id: string;
      name: string;
      symbol: string;
      market_cap_rank?: number;
      thumb?: string;
      large?: string;
    }[];
  }>(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
    signal,
  );
  return (json.coins ?? []).slice(0, 8).map((coin) => ({
    id: `crypto:${coin.id}`,
    kind: "crypto" as const,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    provider: "CoinGecko",
    query: coin.id,
    subtitle: coin.market_cap_rank
      ? `CoinGecko rank ${coin.market_cap_rank}`
      : "CoinGecko",
    imageUrl: httpsImageUrl(coin.large ?? coin.thumb),
    url: `https://www.coingecko.com/en/coins/${coin.id}`,
  }));
}

export async function fetchTrendingCrypto(): Promise<SearchResult[]> {
  const data = await fetchJson<CoinGeckoTrending>(
    "https://api.coingecko.com/api/v3/search/trending",
  );
  return (data.coins ?? []).slice(0, 6).map(({ item }) => ({
    id: `crypto:${item.id}`,
    kind: "crypto" as const,
    symbol: item.symbol.toUpperCase(),
    name: item.name,
    provider: "CoinGecko",
    query: item.id,
    subtitle: "Trending",
    imageUrl: httpsImageUrl(item.large ?? item.small ?? item.thumb),
    url: `https://www.coingecko.com/en/coins/${item.id}`,
  }));
}
