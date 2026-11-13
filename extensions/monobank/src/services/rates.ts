import { isSupportedRate, toCurrencyRate } from "../api/mappers";
import { getCurrencyRates } from "../api/monobank";
import { CurrencyRateResponse } from "../api/types";
import { FRESH_RATES_TTL, STORAGE_KEYS } from "../data/constants";
import { CurrencyRate } from "../types";
import { recordRates } from "./rateHistory";
import { Cached, readJson, writeJson } from "./storage";

// The same cache as "Show Currency Rates", in the API format.
type RatesCache = Cached<{ rates: CurrencyRateResponse[] }>;

export interface LoadedRates {
  rates: CurrencyRate[];
  /** Whether monobank couldn't be reached and the rates come from an older cache. */
  stale: boolean;
  /** Unix milliseconds. */
  updatedAt: number;
}

/**
 * monobank's currency rates, refetched when the cache is older than `ttl` (5 minutes by default). Falls back to
 * the cache on failure. Fetched rates are also saved as today's snapshot in the rate history.
 */
export async function loadRates(ttl = FRESH_RATES_TTL): Promise<LoadedRates> {
  const cache = await readJson<RatesCache>(STORAGE_KEYS.rates);
  const hasCache = !!cache?.rates?.length;

  if (hasCache && Date.now() - cache.lastUpdated <= ttl) {
    return { rates: cache.rates.map(toCurrencyRate), stale: false, updatedAt: cache.lastUpdated };
  }

  try {
    const rates = (await getCurrencyRates()).filter(isSupportedRate);
    const lastUpdated = Date.now();
    await writeJson(STORAGE_KEYS.rates, { rates, lastUpdated } satisfies RatesCache);
    const currencyRates = rates.map(toCurrencyRate);
    await recordRates(currencyRates, lastUpdated);
    return { rates: currencyRates, stale: false, updatedAt: lastUpdated };
  } catch (error) {
    if (!hasCache) throw error;

    console.error(error);
    return { rates: cache.rates.map(toCurrencyRate), stale: true, updatedAt: cache.lastUpdated };
  }
}
