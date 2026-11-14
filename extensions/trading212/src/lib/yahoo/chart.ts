import { YAHOO_TIMEOUT_MS, YahooHttpError, yahooJson } from "./http";

export type ChartRange = "1D" | "1W" | "1M" | "1Y" | "5Y";

export const CHART_RANGES: ChartRange[] = ["1D", "1W", "1M", "1Y", "5Y"];

export const RANGE_PARAMS: Record<ChartRange, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "30m" },
  "1M": { range: "1mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  "5Y": { range: "5y", interval: "1wk" },
};

export interface PriceSeries {
  symbol: string;
  currency: string;
  exchangeName: string;
  /** `t` in epoch milliseconds. */
  points: { t: number; close: number }[];
  previousClose: number;
  price: number;
  /** Epoch milliseconds. */
  marketTime: number;
}

const MINOR_UNITS: Record<string, { divisor: number; currency: string }> = {
  GBX: { divisor: 100, currency: "GBP" },
  GBp: { divisor: 100, currency: "GBP" },
  ZAc: { divisor: 100, currency: "ZAR" },
  ILA: { divisor: 100, currency: "ILS" },
};

/** The major currency for a minor-unit code ("GBX"/"GBp" → "GBP"); other codes unchanged. */
export function majorCurrency(currency: string): string {
  return MINOR_UNITS[currency]?.currency ?? currency;
}

export function priceInMajorUnits(price: number, currency: string): { price: number; currency: string } {
  const minor = MINOR_UNITS[currency];
  if (!minor) return { price, currency };
  return { price: price / minor.divisor, currency: minor.currency };
}

interface ChartMeta {
  symbol?: string;
  currency?: string;
  exchangeName?: string;
  fullExchangeName?: string;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketPrice?: number;
  regularMarketTime?: number;
}

interface ChartResponse {
  chart?: {
    error?: { code?: string; description?: string } | null;
    result?: Array<{
      meta?: ChartMeta;
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }> | null;
  };
}

export function parseChartResponse(json: unknown): PriceSeries {
  const chart = (json as ChartResponse | null)?.chart;
  if (chart?.error) {
    throw new Error(`Yahoo chart error: ${chart.error.description ?? chart.error.code ?? "unknown"}`);
  }
  const result = chart?.result?.[0];
  if (!result?.meta) throw new Error("Yahoo chart response has no result");
  const { meta } = result;
  if (typeof meta.currency !== "string") throw new Error("Yahoo chart response is missing currency");
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const points: PriceSeries["points"] = [];
  timestamps.forEach((ts, i) => {
    const close = closes[i];
    if (typeof close === "number") points.push({ t: ts * 1000, close });
  });
  if (points.length === 0) throw new Error("Yahoo chart response has no price points");
  const last = points[points.length - 1];
  const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
  return {
    symbol: meta.symbol ?? "",
    currency: meta.currency,
    exchangeName: meta.fullExchangeName ?? meta.exchangeName ?? "",
    points,
    previousClose: num(meta.chartPreviousClose) ?? num(meta.previousClose) ?? points[0].close,
    price: num(meta.regularMarketPrice) ?? last.close,
    marketTime: meta.regularMarketTime !== undefined ? meta.regularMarketTime * 1000 : last.t,
  };
}

export function toMajorUnits(series: PriceSeries): PriceSeries {
  if (!MINOR_UNITS[series.currency]) return series;
  const convert = (value: number) => priceInMajorUnits(value, series.currency).price;
  return {
    ...series,
    currency: majorCurrency(series.currency),
    points: series.points.map((p) => ({ t: p.t, close: convert(p.close) })),
    previousClose: convert(series.previousClose),
    price: convert(series.price),
  };
}

export async function fetchChart(
  symbol: string,
  range: ChartRange,
  fetchFn: typeof fetch = fetch,
  timeoutMs = YAHOO_TIMEOUT_MS,
): Promise<PriceSeries> {
  const { range: r, interval } = RANGE_PARAMS[range];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${r}&interval=${interval}`;
  const series = parseChartResponse(await yahooJson(url, fetchFn, timeoutMs));
  return toMajorUnits({ ...series, symbol });
}

/** The listing's major currency, or null when Yahoo has no such symbol. Other failures throw. */
export async function probeYahooCurrency(
  symbol: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = YAHOO_TIMEOUT_MS,
): Promise<string | null> {
  try {
    return (await fetchChart(symbol, "1D", fetchFn, timeoutMs)).currency;
  } catch (e) {
    if (e instanceof YahooHttpError && e.status === 404) return null;
    throw e;
  }
}

/** Identifies one price-chart request; null when there's no symbol to fetch. */
export function priceChartKey(symbol: string | null, range: ChartRange): string | null {
  return symbol === null ? null : `${symbol}|${range}`;
}

/**
 * A chart counts as loading until the request for the current key has settled. `usePromise` flips its
 * own `isLoading` only after an effect runs, so the first render after a key change would otherwise
 * look settled-with-no-data.
 */
export function isPriceChartLoading(s: {
  key: string | null;
  settledKey: string | null;
  isLoading: boolean;
  hasData: boolean;
}): boolean {
  if (s.key === null) return false;
  return s.isLoading || (!s.hasData && s.settledKey !== s.key);
}
