/**
 * Orchestrates the data the command needs into a single load: the current spot
 * price (cached with a short TTL) plus the period averages derived from the
 * rolling history. Keeping the request-shaping here lets the UI stay declarative
 * and keeps every metals.dev call funnelled through the caching logic.
 *
 * The stored history is in USD (the API's native unit); this layer converts it
 * to the display currency using the live USD->currency rate returned by the
 * latest endpoint.
 */

import { LocalStorage } from "@raycast/api";
import { fetchLatestGold } from "./api";
import { DEFAULT_CURRENCY } from "./currency";
import {
  AVERAGE_WINDOWS_DAYS,
  computeAverages,
  ensureWindow,
  getCoveredFrom,
  loadStoredSeries,
  pendingRequestsForWindow,
  syncRecent,
} from "./history";
import { todayIso } from "./dates";

/**
 * The spot-price cache is keyed per currency: `metals.gold` and the USD rate
 * are both currency-specific, so switching currency must be a cache miss (else
 * we'd show one currency's price labelled as another until the TTL expired).
 * History stays USD-canonical and shared across currencies — no per-currency
 * history cost.
 */
const latestKey = (currency: string) => `gold-latest-${currency}`;
/**
 * Serve a cached spot price for this long before hitting the API again (ms).
 * This is a daily tracker, so hours of staleness is fine and it keeps casual
 * re-opens from spending quota; a hard refresh always forces a live fetch.
 */
const LATEST_TTL_MS = 12 * 60 * 60 * 1000;

interface CachedLatest {
  pricePerTroyOunce: number;
  /** USD→currency rate, or null if unavailable (see `fetchLatestGold`). */
  usdToLocalRate: number | null;
  timestamp?: string;
  cachedAt: number;
}

/** A period average expressed in the display currency, ready for the UI. */
export interface PeriodAverage {
  /** Window length in days (30/90/180/365). */
  days: number;
  /** Mean gold price per troy ounce in the display currency, or null if no data. */
  averagePerTroyOunce: number | null;
  /** Number of daily data points that fell inside the window. */
  sampleCount: number;
  /**
   * How many `/timeseries` requests it would take to fully load this window's
   * history right now. `0` means it's already loaded; `> 0` means the row is
   * not yet loaded and the UI should offer a "Load …" action showing this count.
   */
  pendingRequests: number;
}

export interface GoldData {
  /** Current gold spot price per troy ounce, in the display currency. */
  latestPerTroyOunce: number;
  /** Freshness of the spot price (from the API, or our cache time). */
  asOf: string;
  /** Previous close used for the day's change, in the display currency, or null. */
  previousClosePerTroyOunce: number | null;
  /** Averages over 1M/3M/6M/1Y, per troy ounce in the display currency. */
  averages: PeriodAverage[];
  /** Number of daily points backing the averages. */
  historyPoints: number;
  /** Set if the history sync failed; averages then come from cached data. */
  historyError?: string;
}

async function loadCachedLatest(currency: string): Promise<CachedLatest | null> {
  const raw = await LocalStorage.getItem<string>(latestKey(currency));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedLatest;
  } catch {
    return null;
  }
}

async function getLatest(apiKey: string, currency: string, force: boolean): Promise<CachedLatest> {
  const cached = await loadCachedLatest(currency);
  // `usdToLocalRate !== undefined` skips caches written before the field existed
  // (null is a valid cached value: rate genuinely unavailable for this currency).
  if (!force && cached && cached.usdToLocalRate !== undefined && Date.now() - cached.cachedAt < LATEST_TTL_MS) {
    return cached;
  }
  const { pricePerTroyOunce, usdToLocalRate, timestamp } = await fetchLatestGold(apiKey, currency);
  const fresh: CachedLatest = { pricePerTroyOunce, usdToLocalRate, timestamp, cachedAt: Date.now() };
  await LocalStorage.setItem(latestKey(currency), JSON.stringify(fresh));
  return fresh;
}

/** The most recent series close (USD/toz) strictly before today. */
function previousCloseUsd(series: Record<string, number>): number | null {
  const today = todayIso();
  const priorDates = Object.keys(series)
    .filter((date) => date < today)
    .sort();
  const last = priorDates[priorDates.length - 1];
  return last ? series[last] : null;
}

/**
 * Load everything the command renders. `force` bypasses the caches/TTLs.
 *
 * The current price and the history are loaded independently: the price is
 * required (its failure surfaces as an error), but a history failure — e.g. a
 * bad chunk or timeseries not being on the user's plan — must not hide the
 * price. In that case we fall back to whatever history is already cached.
 */
export async function loadGoldData(
  apiKey: string,
  currency: string = DEFAULT_CURRENCY,
  force = false,
): Promise<GoldData> {
  // Kick off both together, but handle their failures separately. The default
  // sync only keeps the recent ~30 days fresh (≤1 request); longer windows are
  // loaded on demand via `ensureHistoryWindow`.
  const latestPromise = getLatest(apiKey, currency, force);
  const syncPromise = syncRecent(apiKey, { force }).then(
    (sync) => ({ series: sync.series as Record<string, number>, error: undefined as string | undefined }),
    async (err: Error) => ({ series: await loadStoredSeries(), error: err.message }),
  );

  const latest = await latestPromise; // if this rejects, the whole load fails (no price to show)
  const { series, error } = await syncPromise;
  const coveredFrom = await getCoveredFrom();

  // No usable USD→currency rate: keep showing the live spot price (it comes
  // straight from /latest in the display currency), but the USD history can't
  // be converted, so averages and the day's change degrade to "no data".
  const rate = latest.usdToLocalRate;
  const prevCloseUsd = previousCloseUsd(series);
  const averages: PeriodAverage[] = computeAverages(series).map((avg) => {
    const pendingRequests = pendingRequestsForWindow(coveredFrom, avg.days);
    return {
      days: avg.days,
      sampleCount: avg.sampleCount,
      // A window that isn't fully loaded reports no average — showing a mean
      // built from a fraction of its span (e.g. a "6M" average from 1 month of
      // data) would be misleading. The UI offers a "Load …" action instead.
      averagePerTroyOunce:
        pendingRequests > 0 || avg.averagePerTroyOunceUsd === null || rate === null
          ? null
          : avg.averagePerTroyOunceUsd * rate,
      pendingRequests,
    };
  });

  return {
    latestPerTroyOunce: latest.pricePerTroyOunce,
    asOf: latest.timestamp ?? new Date(latest.cachedAt).toISOString(),
    previousClosePerTroyOunce: prevCloseUsd === null || rate === null ? null : prevCloseUsd * rate,
    averages,
    historyPoints: Object.keys(series).length,
    historyError: error,
  };
}

/**
 * Load the older history needed to fully cover a `days`-length averaging window
 * (user-triggered from the UI). Fires the `/timeseries` requests, caches them,
 * and returns how many it made. Callers revalidate afterward so the now-larger
 * series feeds the averages.
 */
export async function ensureHistoryWindow(apiKey: string, days: number): Promise<number> {
  const { requestsMade } = await ensureWindow(apiKey, days);
  return requestsMade;
}

export { AVERAGE_WINDOWS_DAYS };
