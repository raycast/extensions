import type { Interval } from "../types";
import { get } from "./client";

export interface ChartMeta {
  regularMarketPrice: number;
  chartPreviousClose: number;
  currency: string;
  symbol: string;
}

export interface ChartData {
  timestamps: number[];
  closes: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
  meta: ChartMeta;
}

interface ChartIndicatorQuote {
  close: (number | null)[];
  open: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  volume: (number | null)[];
}

interface ChartResponseResult {
  meta: {
    regularMarketPrice: number;
    chartPreviousClose: number;
    currency: string;
    symbol: string;
  };
  timestamp: number[];
  indicators: {
    quote: ChartIndicatorQuote[];
  };
}

interface ChartResponse {
  chart: {
    result: ChartResponseResult[];
  };
}

export const INTERVAL_MAP: Record<
  Interval,
  { range: string; interval: string }
> = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "15m" },
  "1M": { range: "1mo", interval: "1h" },
  "3M": { range: "3mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  "5Y": { range: "5y", interval: "1wk" },
};

export async function fetchChart(
  symbol: string,
  uiInterval: Interval,
  signal?: AbortSignal,
): Promise<ChartData> {
  const mapping = INTERVAL_MAP[uiInterval];

  const res = await get<ChartResponse>(
    `/v8/finance/chart/${encodeURIComponent(symbol)}`,
    {
      range: mapping.range,
      interval: mapping.interval,
      includePrePost: "false",
    },
    signal,
  );

  const result = res.chart.result[0];
  const q = result.indicators.quote[0];
  const timestamps = result.timestamp ?? [];

  return {
    timestamps,
    closes: timestamps.map((_, i) => q.close[i] ?? 0),
    opens: timestamps.map((_, i) => q.open[i] ?? 0),
    highs: timestamps.map((_, i) => q.high[i] ?? 0),
    lows: timestamps.map((_, i) => q.low[i] ?? 0),
    volumes: timestamps.map((_, i) => q.volume[i] ?? 0),
    meta: {
      regularMarketPrice: result.meta.regularMarketPrice,
      chartPreviousClose: result.meta.chartPreviousClose,
      currency: result.meta.currency,
      symbol: result.meta.symbol,
    },
  };
}
