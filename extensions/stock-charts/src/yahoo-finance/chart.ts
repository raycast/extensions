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
  const allTimestamps = result.timestamp ?? [];

  // Filter out null-close slots (intraday/weekend gaps) to avoid zero-spike
  // artifacts in the chart renderer.
  const validIdx = allTimestamps
    .map((_, i) => i)
    .filter((i) => q.close[i] != null);

  return {
    timestamps: validIdx.map((i) => allTimestamps[i]),
    closes: validIdx.map((i) => q.close[i] as number),
    opens: validIdx.map((i) => q.open[i] ?? (q.close[i] as number)),
    highs: validIdx.map((i) => q.high[i] ?? (q.close[i] as number)),
    lows: validIdx.map((i) => q.low[i] ?? (q.close[i] as number)),
    volumes: validIdx.map((i) => q.volume[i] ?? 0),
    meta: {
      regularMarketPrice: result.meta.regularMarketPrice,
      chartPreviousClose: result.meta.chartPreviousClose,
      currency: result.meta.currency,
      symbol: result.meta.symbol,
    },
  };
}
