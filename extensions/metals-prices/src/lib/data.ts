/**
 * Orchestrates the data the command needs into a single load: the current spot
 * price of every supported metal (cached with a short TTL) plus the period
 * averages derived from the rolling history. Keeping the request-shaping here
 * lets the UI stay declarative and keeps every metals.dev call funnelled through
 * the caching logic.
 *
 * Because both endpoints return all metals per request, one load covers gold,
 * silver, platinum and palladium — switching metal in the UI is free.
 *
 * The stored history is in USD (the API's native unit); this layer converts it
 * to the display currency using the live USD->currency rate returned by the
 * latest endpoint.
 */

import { LocalStorage } from "@raycast/api";
import { fetchLatestMetals, MetalPrices } from "./api";
import { DEFAULT_CURRENCY } from "./currency";
import {
  AVERAGE_WINDOWS_DAYS,
  computeAverages,
  ensureWindow,
  getCoveredFrom,
  loadStoredSeries,
  pendingRequestsForWindow,
  previousCloseUsd,
  syncRecent,
} from "./history";
import { METAL_KEYS, MetalKey } from "./metals";

/**
 * The spot-price cache is keyed per currency: the metal prices and the USD rate
 * are all currency-specific, so switching currency must be a cache miss (else
 * we'd show one currency's price labelled as another until the TTL expired).
 * History stays USD-canonical and shared across currencies — no per-currency
 * history cost. The `metals-` prefix also retires the gold-only cache shape,
 * which held a single price under a different field name.
 */
const latestKey = (currency: string) => `metals-latest-${currency}`;
/**
 * Serve a cached spot price for this long before hitting the API again (ms).
 * This is a daily tracker, so hours of staleness is fine and it keeps casual
 * re-opens from spending quota; a hard refresh always forces a live fetch.
 */
const LATEST_TTL_MS = 12 * 60 * 60 * 1000;

interface CachedLatest {
  /** Per-metal spot price per troy ounce, in the display currency. */
  prices: MetalPrices;
  /** USD→currency rate, or null if unavailable (see `fetchLatestMetals`). */
  usdToLocalRate: number | null;
  timestamp?: string;
  cachedAt: number;
}

/** A period average expressed in the display currency, ready for the UI. */
export interface PeriodAverage {
  /** Window length in days (30/90/180/365). */
  days: number;
  /** Mean price per troy ounce in the display currency, or null if no data. */
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

/** Everything the UI renders for one metal. */
export interface MetalData {
  /** Current spot price per troy ounce in the display currency, or null if the API omitted it. */
  latestPerTroyOunce: number | null;
  /** Previous close used for the day's change, in the display currency, or null. */
  previousClosePerTroyOunce: number | null;
  /** Averages over 1M/3M/6M/1Y, per troy ounce in the display currency. */
  averages: PeriodAverage[];
}

export interface MetalsData {
  /** Freshness of the spot prices (from the API, or our cache time). */
  asOf: string;
  /** Per-metal prices, averages and history depth. */
  metals: Record<MetalKey, MetalData>;
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
  const usable = cached && cached.prices && cached.usdToLocalRate !== undefined;
  if (!force && usable && Date.now() - cached.cachedAt < LATEST_TTL_MS) {
    return cached;
  }
  const { prices, usdToLocalRate, timestamp } = await fetchLatestMetals(apiKey, currency);
  const fresh: CachedLatest = { prices, usdToLocalRate, timestamp, cachedAt: Date.now() };
  await LocalStorage.setItem(latestKey(currency), JSON.stringify(fresh));
  return fresh;
}

/**
 * Load everything the command renders. `force` bypasses the caches/TTLs.
 *
 * The current prices and the history are loaded independently: the prices are
 * required (their failure surfaces as an error), but a history failure — e.g. a
 * bad chunk or timeseries not being on the user's plan — must not hide them. In
 * that case we fall back to whatever history is already cached.
 */
export async function loadMetalsData(
  apiKey: string,
  currency: string = DEFAULT_CURRENCY,
  force = false,
): Promise<MetalsData> {
  // Kick off both together, but handle their failures separately. The default
  // sync only keeps the recent ~30 days fresh (≤1 request); longer windows are
  // loaded on demand via `ensureHistoryWindow`.
  const latestPromise = getLatest(apiKey, currency, force);
  const syncPromise = syncRecent(apiKey, { force }).then(
    (sync) => ({ series: sync.series, error: undefined as string | undefined }),
    async (err: Error) => ({ series: await loadStoredSeries(), error: err.message }),
  );

  const latest = await latestPromise; // if this rejects, the whole load fails (no prices to show)
  const { series, error } = await syncPromise;

  // No usable USD→currency rate: keep showing the live spot prices (they come
  // straight from /latest in the display currency), but the USD history can't
  // be converted, so averages and the day's change degrade to "no data".
  const rate = latest.usdToLocalRate;

  const metals = {} as Record<MetalKey, MetalData>;
  for (const metal of METAL_KEYS) {
    const coveredFrom = await getCoveredFrom(metal);
    const prevCloseUsd = previousCloseUsd(series, metal);
    const averages: PeriodAverage[] = computeAverages(series, metal).map((avg) => {
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

    metals[metal] = {
      latestPerTroyOunce: latest.prices[metal] ?? null,
      previousClosePerTroyOunce: prevCloseUsd === null || rate === null ? null : prevCloseUsd * rate,
      averages,
    };
  }

  return {
    asOf: latest.timestamp ?? new Date(latest.cachedAt).toISOString(),
    metals,
    historyError: error,
  };
}

/**
 * Load the older history needed to fully cover a `days`-length averaging window
 * for one metal (user-triggered from the UI). Fires the `/timeseries` requests,
 * caches them — for every metal they carry, not just this one — and returns how
 * many it made. Callers revalidate afterward so the now-larger series feeds the
 * averages.
 */
export async function ensureHistoryWindow(apiKey: string, metal: MetalKey, days: number): Promise<number> {
  const { requestsMade } = await ensureWindow(apiKey, metal, days);
  return requestsMade;
}

export { AVERAGE_WINDOWS_DAYS };
