/**
 * Thin client for the metals.dev REST API.
 *
 * Two endpoints are used:
 *  - /v1/latest     -> current spot for **every** metal in one response, already
 *                      in the requested display currency (default SAR).
 *  - /v1/timeseries -> up to ~30 daily points per call, each carrying **every**
 *                      metal, in USD; callers convert to the display currency
 *                      downstream.
 *
 * Both endpoints return all metals per request, so covering silver, platinum and
 * palladium alongside gold costs no extra requests — the same call is simply
 * read for more keys.
 *
 * Free tier is 100 requests/month, so callers are expected to cache results.
 */

import { DEFAULT_CURRENCY } from "./currency";
import { METAL_KEYS, MetalKey } from "./metals";

const BASE_URL = "https://api.metals.dev/v1";

/** metals.dev caps a single timeseries request to a 30-day range. */
export const MAX_TIMESERIES_RANGE_DAYS = 30;

export class MetalsDevError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "MetalsDevError";
  }
}

/** Spot price per troy ounce for each metal the response carried. */
export type MetalPrices = Partial<Record<MetalKey, number>>;

/** Raw `metals` map; also holds authority/industrial keys we don't read. */
type RawMetals = Record<string, number | undefined>;

interface LatestResponse {
  status: string;
  currency: string;
  unit: string;
  metals: RawMetals;
  // In a currency-X response, currencies.USD is "value of 1 USD in X" (for SAR
  // that is the ~3.75 peg); we reuse it to convert the USD-only history.
  currencies?: { USD?: number };
  timestamp?: string;
}

interface TimeseriesResponse {
  status: string;
  // The timeseries endpoint always returns metal rates in USD/toz (its
  // `currencies` map does not include most fiat currencies), so we read the
  // metals in USD and convert separately using the USD->currency rate.
  rates: Record<string, { metals?: RawMetals }>;
}

/**
 * The Saudi Riyal is hard-pegged to the US Dollar at 3.75 SAR/USD by SAMA and
 * has been since 1986; used as a fallback when a live rate is unavailable.
 */
export const SAR_PER_USD_PEG = 3.75;

/** One day's prices, per troy ounce in USD (the API's native unit). */
export interface DailyMetalPoint {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Per-troy-ounce USD price of each metal present that day. */
  prices: MetalPrices;
}

/** Pick the metals we support out of a raw `metals` map, ignoring the rest. */
function pickSupportedMetals(raw: RawMetals | undefined): MetalPrices {
  const prices: MetalPrices = {};
  for (const key of METAL_KEYS) {
    const value = raw?.[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      prices[key] = value;
    }
  }
  return prices;
}

async function request<T>(path: string, apiKey: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ api_key: apiKey, ...params });
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}?${query.toString()}`);
  } catch (error) {
    throw new MetalsDevError(`Network error contacting metals.dev: ${(error as Error).message}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new MetalsDevError("Invalid or unauthorized metals.dev API key.", response.status);
  }
  if (response.status === 429) {
    throw new MetalsDevError("metals.dev rate limit / monthly quota reached. Try again later.", 429);
  }
  if (!response.ok) {
    throw new MetalsDevError(`metals.dev returned HTTP ${response.status}.`, response.status);
  }

  const body = (await response.json()) as T & { status?: string; error_message?: string };
  if (body.status && body.status !== "success") {
    throw new MetalsDevError(body.error_message ?? "metals.dev request was not successful.");
  }
  return body;
}

/**
 * Current spot price per troy ounce for every supported metal in the display
 * currency, plus the live USD->currency rate (from `currencies.USD`, e.g. 3.75
 * for SAR), which callers reuse to convert the USD-only historical series.
 *
 * `usdToLocalRate` is `null` when the response omits a usable rate and we have no
 * safe fallback: USD needs no conversion (rate 1), and SAR has its hard peg; for
 * any other currency a missing rate means we cannot convert history and callers
 * must degrade (show no averages) rather than convert at a wrong rate.
 */
export async function fetchLatestMetals(
  apiKey: string,
  currency: string = DEFAULT_CURRENCY,
): Promise<{ prices: MetalPrices; usdToLocalRate: number | null; timestamp?: string }> {
  const data = await request<LatestResponse>("/latest", apiKey, {
    currency,
    unit: "toz",
  });
  const prices = pickSupportedMetals(data.metals);
  if (Object.keys(prices).length === 0) {
    throw new MetalsDevError("metals.dev latest response did not include any metal prices.");
  }
  const usdRate = data.currencies?.USD;
  const liveRate = typeof usdRate === "number" && usdRate > 0 ? usdRate : null;
  // USD history needs no conversion (rate 1); SAR falls back to its hard peg.
  const usdToLocalRate = liveRate ?? (currency === "USD" ? 1 : currency === "SAR" ? SAR_PER_USD_PEG : null);
  return { prices, usdToLocalRate, timestamp: data.timestamp };
}

/**
 * Daily prices in USD per troy ounce for an inclusive date range (max 30 days),
 * every supported metal per day. The endpoint returns USD only; conversion to
 * the display currency happens downstream so the stored history stays
 * currency-canonical.
 */
export async function fetchTimeseriesMetalsUsd(
  apiKey: string,
  startDate: string,
  endDate: string,
): Promise<DailyMetalPoint[]> {
  const data = await request<TimeseriesResponse>("/timeseries", apiKey, {
    start_date: startDate,
    end_date: endDate,
  });

  const points: DailyMetalPoint[] = [];
  for (const [date, row] of Object.entries(data.rates ?? {})) {
    const prices = pickSupportedMetals(row.metals);
    if (Object.keys(prices).length === 0) {
      continue;
    }
    points.push({ date, prices });
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}
