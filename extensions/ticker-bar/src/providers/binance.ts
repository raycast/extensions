import { createMicroBatcher } from "../market-batch";
import { formatPrice } from "../market-format";
import { fetchJson } from "../market-http";
import { binancePairBase } from "../market-ids";
import { Asset, Quote, SearchResult } from "../market-types";
import { fetchCryptoLogo } from "./crypto-logo";
import { finiteNumber } from "./shared";
import { stockLogoUrl } from "./stock-logo";

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  openPrice?: string;
  highPrice?: string;
  lowPrice?: string;
  quoteVolume?: string;
};

type BinancePerpMetadata = {
  symbol: string;
  underlyingType?: string;
};

type BinanceExchangeInfo = {
  symbols?: BinancePerpMetadata[];
};

export type BinanceSnapshot = {
  price: number;
  changePercent?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
};

const loadBinanceTickers = createMicroBatcher<string, BinanceSnapshot>(
  async (symbols) => {
    const data = await fetchJson<BinanceTicker[]>(
      `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`,
    );
    return new Map(
      data.flatMap((ticker) => {
        const price = Number(ticker.lastPrice);
        if (!Number.isFinite(price) || price <= 0) return [];
        const changePercent = Number(ticker.priceChangePercent);
        return [
          [
            ticker.symbol,
            {
              price,
              changePercent: Number.isFinite(changePercent)
                ? changePercent
                : undefined,
              open: finiteNumber(ticker.openPrice),
              high: finiteNumber(ticker.highPrice),
              low: finiteNumber(ticker.lowPrice),
              volume: finiteNumber(ticker.quoteVolume),
            },
          ] as const,
        ];
      }),
    );
  },
);

export async function fetchBinanceTicker(
  symbol: string,
): Promise<BinanceSnapshot | undefined> {
  return loadBinanceTickers(symbol);
}

export async function fetchBinanceQuote(
  asset: Asset,
): Promise<Quote | undefined> {
  const ticker = await fetchBinanceTicker(asset.query);
  if (!ticker) return undefined;
  const base = binancePairBase(asset.query);
  const quoteAsset = asset.query.slice(base.length);
  return {
    id: asset.id,
    kind: asset.kind,
    symbol: asset.symbol,
    name: asset.name,
    price: ticker.price,
    priceLabel: formatExchangePrice(ticker.price, quoteAsset),
    changePercent: ticker.changePercent,
    provider: "Binance",
    asOf: new Date().toISOString(),
    url: `https://www.binance.com/en/trade/${base}_${quoteAsset}?type=spot`,
    open: ticker.open,
    high: ticker.high,
    low: ticker.low,
    volume: ticker.volume,
  };
}

export async function fetchBinancePerpQuote(
  asset: Asset,
): Promise<Quote | undefined> {
  const base = binancePairBase(asset.query);
  const [ticker, imageUrl] = await Promise.all([
    fetchBinancePerpTicker(asset.query),
    fetchBinancePerpLogo(asset.query, base),
  ]);
  if (!ticker) return undefined;
  return {
    id: asset.id,
    kind: asset.kind,
    symbol: asset.symbol,
    name: asset.name,
    price: ticker.price,
    priceLabel: formatPrice(ticker.price, "usd"),
    changePercent: ticker.changePercent,
    provider: "Binance Futures",
    asOf: new Date().toISOString(),
    url: `https://www.binance.com/en/futures/${asset.query}`,
    subtitle:
      ticker.funding !== undefined
        ? `Perpetual · funding ${(ticker.funding * 100).toFixed(4)}%`
        : "Perpetual",
    open: ticker.open,
    high: ticker.high,
    low: ticker.low,
    volume: ticker.volume,
    fundingRate: ticker.funding,
    imageUrl,
  };
}

export async function searchBinance(query: string): Promise<SearchResult[]> {
  const base = query.toUpperCase();
  const pair = base.endsWith("USDT") ? base : `${base}USDT`;
  const ticker = await fetchBinanceTicker(pair);
  if (!ticker) return [];
  const pairBase = binancePairBase(pair);
  const quoteAsset = pair.slice(pairBase.length);
  return [
    {
      id: `binance:${pair}`,
      kind: "binance",
      symbol: pairBase,
      name: `${pairBase} / ${quoteAsset}`,
      provider: "Binance",
      query: pair,
      subtitle: `Binance ${formatExchangePrice(ticker.price, quoteAsset)}`,
      url: `https://www.binance.com/en/trade/${pairBase}_${quoteAsset}?type=spot`,
    },
  ];
}

export async function searchBinancePerp(
  query: string,
): Promise<SearchResult[]> {
  const base = query.toUpperCase();
  const pair = base.endsWith("USDT") ? base : `${base}USDT`;
  const pairBase = binancePairBase(pair);
  const [ticker, imageUrl] = await Promise.all([
    fetchBinancePerpTicker(pair),
    fetchBinancePerpLogo(pair, pairBase),
  ]);
  if (!ticker) return [];
  return [
    {
      id: `binanceperp:${pair}`,
      kind: "binanceperp",
      symbol: pairBase,
      name: `${pairBase} Perpetual`,
      provider: "Binance Futures",
      query: pair,
      subtitle: `Perpetual ${formatPrice(ticker.price, "usd")}`,
      url: `https://www.binance.com/en/futures/${pair}`,
      imageUrl,
    },
  ];
}

async function fetchBinancePerpTicker(symbol: string): Promise<
  | (BinanceSnapshot & {
      funding?: number;
    })
  | undefined
> {
  const ticker = await fetchJson<BinanceTicker>(
    `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${encodeURIComponent(symbol)}`,
  );
  const price = Number(ticker.lastPrice);
  if (!Number.isFinite(price) || price <= 0) return undefined;
  const changePercent = Number(ticker.priceChangePercent);
  let funding: number | undefined;
  try {
    const premium = await fetchJson<{ lastFundingRate: string }>(
      `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`,
    );
    funding = finiteNumber(premium.lastFundingRate);
  } catch {
    // Funding enriches the quote but is not required for a valid price.
  }
  return {
    price,
    changePercent: Number.isFinite(changePercent) ? changePercent : undefined,
    funding,
    open: finiteNumber(ticker.openPrice),
    high: finiteNumber(ticker.highPrice),
    low: finiteNumber(ticker.lowPrice),
    volume: finiteNumber(ticker.quoteVolume),
  };
}

let perpMetadataCache:
  | { expiresAt: number; value: Map<string, BinancePerpMetadata> }
  | undefined;
let perpMetadataRequest: Promise<Map<string, BinancePerpMetadata>> | undefined;

async function fetchBinancePerpLogo(
  pair: string,
  base: string,
): Promise<string | undefined> {
  try {
    const metadata = (await loadBinancePerpMetadata()).get(pair);
    if (metadata?.underlyingType === "EQUITY") return stockLogoUrl(base);
    if (metadata?.underlyingType === "COIN") return await fetchCryptoLogo(base);
  } catch {
    // Artwork is optional. Do not guess from the symbol: equity perps can
    // collide with unrelated crypto tickers (for example MSTR).
  }
  return undefined;
}

async function loadBinancePerpMetadata() {
  if (perpMetadataCache && perpMetadataCache.expiresAt > Date.now()) {
    return perpMetadataCache.value;
  }
  perpMetadataRequest ??= fetchJson<BinanceExchangeInfo>(
    "https://fapi.binance.com/fapi/v1/exchangeInfo",
  ).then((data) => {
    const value = new Map(
      (data.symbols ?? []).map((metadata) => [metadata.symbol, metadata]),
    );
    perpMetadataCache = {
      expiresAt: Date.now() + 6 * 60 * 60 * 1_000,
      value,
    };
    return value;
  });
  try {
    return await perpMetadataRequest;
  } finally {
    perpMetadataRequest = undefined;
  }
}

function formatExchangePrice(price: number, quoteAsset: string) {
  const currency =
    quoteAsset === "EUR"
      ? "eur"
      : ["USDT", "FDUSD", "USDC", "BUSD", "TUSD"].includes(quoteAsset)
        ? "usd"
        : undefined;
  return currency
    ? formatPrice(price, currency)
    : `${price.toLocaleString("en-US", { maximumSignificantDigits: 6 })} ${quoteAsset}`;
}
