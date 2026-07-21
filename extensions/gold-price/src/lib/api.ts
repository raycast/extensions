/**
 * Thin client for the metals.dev REST API.
 *
 * Two endpoints are used:
 *  - /v1/latest    -> current gold spot, returned directly in the requested
 *                     display currency (default SAR).
 *  - /v1/timeseries -> up to ~30 daily points per call, returned in USD; callers
 *                      convert each day to the display currency downstream.
 *
 * Free tier is 100 requests/month, so callers are expected to cache results.
 */

import { DEFAULT_CURRENCY } from "./currency";

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

interface LatestResponse {
  status: string;
  currency: string;
  unit: string;
  metals: { gold?: number };
  // In a currency-X response, currencies.USD is "value of 1 USD in X" (for SAR
  // that is the ~3.75 peg); we reuse it to convert the USD-only history.
  currencies?: { USD?: number };
  timestamp?: string;
}

interface TimeseriesResponse {
  status: string;
  // The timeseries endpoint always returns metal rates in USD/toz (its
  // `currencies` map does not include most fiat currencies), so we read gold in
  // USD and convert separately using the USD->currency rate from /latest.
  rates: Record<string, { metals?: { gold?: number } }>;
}

/**
 * The Saudi Riyal is hard-pegged to the US Dollar at 3.75 SAR/USD by SAMA and
 * has been since 1986; used as a fallback when a live rate is unavailable.
 */
export const SAR_PER_USD_PEG = 3.75;

/** One day's gold price expressed per troy ounce, in USD (the API's native unit). */
export interface DailyGoldPoint {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Gold price per troy ounce, in USD. */
  pricePerTroyOunceUsd: number;
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
 * Current gold spot price per troy ounce in the display currency, plus the live
 * USD->currency rate (from `currencies.USD` in the response, e.g. 3.75 for SAR),
 * which callers reuse to convert the USD-only historical series.
 *
 * `usdToLocalRate` is `null` when the response omits a usable rate: the SAR peg
 * is a valid fallback only for SAR, so for any other currency a missing rate
 * means we cannot convert history and callers must degrade (show no averages)
 * rather than convert at a wrong rate.
 */
export async function fetchLatestGold(
  apiKey: string,
  currency: string = DEFAULT_CURRENCY,
): Promise<{ pricePerTroyOunce: number; usdToLocalRate: number | null; timestamp?: string }> {
  const data = await request<LatestResponse>("/latest", apiKey, {
    currency,
    unit: "toz",
  });
  const gold = data.metals?.gold;
  if (typeof gold !== "number") {
    throw new MetalsDevError("metals.dev latest response did not include a gold price.");
  }
  const usdRate = data.currencies?.USD;
  const liveRate = typeof usdRate === "number" && usdRate > 0 ? usdRate : null;
  const usdToLocalRate = liveRate ?? (currency === "SAR" ? SAR_PER_USD_PEG : null);
  return { pricePerTroyOunce: gold, usdToLocalRate, timestamp: data.timestamp };
}

/**
 * Daily gold prices in USD per troy ounce for an inclusive date range (max 30
 * days). The endpoint returns USD only; conversion to the display currency
 * happens downstream so the stored history stays currency-canonical.
 */
export async function fetchTimeseriesGoldUsd(
  apiKey: string,
  startDate: string,
  endDate: string,
): Promise<DailyGoldPoint[]> {
  const data = await request<TimeseriesResponse>("/timeseries", apiKey, {
    start_date: startDate,
    end_date: endDate,
  });

  const points: DailyGoldPoint[] = [];
  for (const [date, row] of Object.entries(data.rates ?? {})) {
    const goldUsd = row.metals?.gold;
    if (typeof goldUsd !== "number") {
      continue;
    }
    points.push({ date, pricePerTroyOunceUsd: goldUsd });
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}
