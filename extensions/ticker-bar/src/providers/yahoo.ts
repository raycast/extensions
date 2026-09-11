import { assetFromId } from "../market-ids";
import { formatPrice } from "../market-format";
import { fetchJson } from "../market-http";
import { Asset, Quote, SearchResult } from "../market-types";
import { finiteNumber } from "./shared";
import { stockLogoUrl } from "./stock-logo";

type YahooTrending = {
  finance: { result?: { quotes?: { symbol: string }[] }[] };
};

type TradingPeriod = {
  pre?: { start: number; end: number };
  regular?: { start: number; end: number };
  post?: { start: number; end: number };
};

type YahooChartResponse = {
  chart: {
    result?: {
      meta: {
        symbol: string;
        shortName?: string;
        longName?: string;
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        regularMarketTime?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
        exchangeName?: string;
        fullExchangeName?: string;
        currentTradingPeriod?: TradingPeriod;
      };
    }[];
  };
};

export async function fetchStockQuote(
  asset: Asset,
  signal?: AbortSignal,
): Promise<Quote | undefined> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.query)}?interval=1m&range=1d&includePrePost=true`;
  const data = await fetchJson<YahooChartResponse>(url, signal);
  const meta = data.chart.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice);
  const previous = Number(meta?.previousClose ?? meta?.chartPreviousClose);
  if (!meta || !Number.isFinite(price) || price <= 0) return undefined;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const marketState = tradingPeriodState(meta.currentTradingPeriod, nowSeconds);

  return {
    id: asset.id,
    kind: asset.kind,
    symbol: meta.symbol,
    name: meta.longName ?? meta.shortName ?? meta.symbol,
    price,
    priceLabel: formatPrice(price, "usd"),
    changePercent:
      Number.isFinite(previous) && previous > 0
        ? ((price - previous) / previous) * 100
        : undefined,
    provider: "Yahoo Finance",
    asOf: new Date((meta.regularMarketTime ?? nowSeconds) * 1000).toISOString(),
    url: `https://finance.yahoo.com/quote/${encodeURIComponent(meta.symbol)}`,
    subtitle: `${marketState} · ${meta.fullExchangeName ?? meta.exchangeName ?? "Market"}`,
    high: finiteNumber(meta.regularMarketDayHigh),
    low: finiteNumber(meta.regularMarketDayLow),
    previousClose: finiteNumber(previous),
    volume: finiteNumber(meta.regularMarketVolume),
    marketState,
    imageUrl: stockLogoUrl(meta.symbol),
  };
}

export async function searchStocks(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const symbol = query.toUpperCase();
  const asset = assetFromId(`stock:${symbol}`);
  if (!asset) return [];
  const quote = await fetchStockQuote(asset, signal);
  if (!quote) return [];
  return [
    {
      id: `stock:${symbol}`,
      kind: "stock",
      symbol,
      name: quote.name,
      provider: "Yahoo Finance",
      query: symbol,
      subtitle: `${quote.priceLabel} · ${quote.marketState ?? "Market"}`,
      url: quote.url,
      imageUrl: stockLogoUrl(symbol),
    },
  ];
}

export async function fetchTrendingStocks(): Promise<SearchResult[]> {
  const data = await fetchJson<YahooTrending>(
    "https://query1.finance.yahoo.com/v1/finance/trending/US?count=15",
  );
  return (data.finance.result?.[0]?.quotes ?? [])
    .map((quote) => quote.symbol)
    .filter((symbol) => /^[A-Z.]{1,8}$/.test(symbol))
    .slice(0, 6)
    .map((symbol) => ({
      id: `stock:${symbol}`,
      kind: "stock" as const,
      symbol,
      name: symbol,
      provider: "Yahoo Finance",
      query: symbol,
      subtitle: "Trending",
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
      imageUrl: stockLogoUrl(symbol),
    }));
}

function tradingPeriodState(
  period: TradingPeriod | undefined,
  nowSeconds: number,
) {
  if (
    period?.pre &&
    nowSeconds >= period.pre.start &&
    nowSeconds < period.pre.end
  ) {
    return "Pre-Market";
  }
  if (
    period?.regular &&
    nowSeconds >= period.regular.start &&
    nowSeconds < period.regular.end
  ) {
    return "Market Open";
  }
  if (
    period?.post &&
    nowSeconds >= period.post.start &&
    nowSeconds < period.post.end
  ) {
    return "After Hours";
  }
  return "Market Closed";
}
