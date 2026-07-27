/**
 * Builds and maintains a rolling daily gold-price series (per troy ounce, in
 * USD — the API's native unit) in Raycast LocalStorage, then derives period
 * averages from it. Conversion to the display currency happens at the call site
 * so the stored history is currency-canonical and rate-independent.
 *
 * To respect the 100-request/month free tier and keep the API-key spend
 * transparent, history is fetched in two clearly separated ways:
 *  - `syncRecent` keeps only the most recent ~30 days fresh, and fires at most
 *    one request per sync (TTL-gated). This is all a normal open ever costs, so
 *    the 1-Month average and the day's change are always available cheaply.
 *  - `ensureWindow` is user-triggered: it backfills the older chunks needed to
 *    cover a longer averaging window (3M/6M/1Y). The number of requests it will
 *    fire is exposed up front via `pendingRequestsForWindow`, so the UI can show
 *    the user what a load costs before they spend the quota.
 */

import { LocalStorage } from "@raycast/api";
import { fetchTimeseriesGoldUsd, MAX_TIMESERIES_RANGE_DAYS } from "./api";
import { addDays, daysBetween, splitIntoChunks, todayIso } from "./dates";

const SERIES_KEY = "gold-series-usd-toz";
const SYNCED_AT_KEY = "gold-series-synced-at";
/**
 * Earliest date (YYYY-MM-DD) we have *attempted* to fetch. This is the authority
 * for "how far back is loaded" — tracked by requested boundary, not by the
 * oldest returned data point, so weekend/holiday gaps at a window's edge don't
 * make a fully-loaded window look partially loaded.
 */
const COVERED_FROM_KEY = "gold-history-covered-from";

/** How many days of history to keep (a bit over a year for the 12-month window). */
const HISTORY_DAYS = 370;
/** Default sync only keeps the most recent ~month fresh (one request, TTL-gated). */
const RECENT_WINDOW_DAYS = 30;
/** Re-sync history at most this often (ms). Keeps daily opens near-free. */
const SYNC_TTL_MS = 12 * 60 * 60 * 1000;
/** Refetch a few trailing days each sync in case recent closes were revised. */
const REFRESH_OVERLAP_DAYS = 3;

/** date (YYYY-MM-DD) -> gold price per troy ounce in USD. */
export type GoldSeries = Record<string, number>;

export async function loadStoredSeries(): Promise<GoldSeries> {
  const raw = await LocalStorage.getItem<string>(SERIES_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as GoldSeries;
  } catch {
    return {};
  }
}

/** Drop entries older than the retention window so storage stays bounded. */
function pruneOldEntries(series: GoldSeries): GoldSeries {
  const cutoff = addDays(todayIso(), -HISTORY_DAYS);
  const pruned: GoldSeries = {};
  for (const [date, price] of Object.entries(series)) {
    if (date >= cutoff) pruned[date] = price;
  }
  return pruned;
}

/** The earliest date we've attempted to fetch, or `null` if nothing yet. */
async function readCoveredFrom(): Promise<string | null> {
  const raw = await LocalStorage.getItem<string>(COVERED_FROM_KEY);
  return raw && raw.length > 0 ? raw : null;
}

/** Extend the covered range backward to `date` (never forward — only lowers). */
async function lowerCoveredFrom(date: string): Promise<void> {
  const current = await readCoveredFrom();
  const next = !current || date < current ? date : current;
  await LocalStorage.setItem(COVERED_FROM_KEY, next);
}

/**
 * The earliest date the stored history covers. Prefers the explicit marker; when
 * it is absent (a series cached before this marker existed) it falls back to the
 * oldest stored date so pre-existing full histories aren't re-offered as "not
 * loaded".
 */
export async function getCoveredFrom(): Promise<string | null> {
  const marker = await readCoveredFrom();
  if (marker) return marker;
  const dates = Object.keys(await loadStoredSeries()).sort();
  return dates.length > 0 ? dates[0] : null;
}

/** The window start for `days`, clamped to the retention horizon. */
function windowStartFor(days: number): string {
  const today = todayIso();
  const retentionStart = addDays(today, -HISTORY_DAYS + 1);
  const start = addDays(today, -days + 1);
  return start < retentionStart ? retentionStart : start;
}

/**
 * How many `/timeseries` requests `ensureWindow(days)` would fire right now,
 * given how far back `coveredFrom` already reaches. `0` means the window is
 * already fully covered. Pure so the UI can display the cost before spending.
 */
export function pendingRequestsForWindow(coveredFrom: string | null, days: number): number {
  const windowStart = windowStartFor(days);
  // Nothing covered yet → the missing range runs from the window start to today.
  const boundary = coveredFrom ?? todayIso();
  if (windowStart >= boundary) return 0;
  return splitIntoChunks(windowStart, addDays(boundary, -1), MAX_TIMESERIES_RANGE_DAYS).length;
}

/**
 * Keep the most recent ~30 days fresh: at most one `/timeseries` request, gated
 * by the 12h TTL (bypassed with `force`). This is all a normal open costs.
 *
 * If the extension hasn't been opened in longer than the recent window, only the
 * recent window is refetched — an older gap may remain rather than triggering a
 * multi-request backfill. For a daily tracker this is rare, and it keeps a
 * routine open strictly single-request; the affected averages just carry a few
 * fewer samples until the user reloads that window.
 */
export async function syncRecent(
  apiKey: string,
  options: { force?: boolean } = {},
): Promise<{ series: GoldSeries; requestsMade: number }> {
  const stored = pruneOldEntries(await loadStoredSeries());
  const today = todayIso();
  const recentStart = windowStartFor(RECENT_WINDOW_DAYS);

  const syncedAtRaw = await LocalStorage.getItem<string>(SYNCED_AT_KEY);
  const syncedAt = syncedAtRaw ? Number(syncedAtRaw) : 0;
  const isFresh = !options.force && Date.now() - syncedAt < SYNC_TTL_MS;

  const cachedDates = Object.keys(stored).sort();
  const newestCached = cachedDates.length > 0 ? cachedDates[cachedDates.length - 1] : undefined;
  const hasGap = !newestCached || daysBetween(newestCached, today) > 0;
  if (isFresh || !hasGap) {
    return { series: stored, requestsMade: 0 };
  }

  // Fetch just after the newest cached day (minus an overlap for revised closes),
  // clamped into the recent window so this is always a single ≤30-day request.
  let fetchStart = newestCached ? addDays(newestCached, -REFRESH_OVERLAP_DAYS) : recentStart;
  if (fetchStart < recentStart) fetchStart = recentStart;

  const points = await fetchTimeseriesGoldUsd(apiKey, fetchStart, today);
  const merged: GoldSeries = { ...stored };
  for (const point of points) {
    merged[point.date] = point.pricePerTroyOunceUsd;
  }

  const finalSeries = pruneOldEntries(merged);
  await LocalStorage.setItem(SERIES_KEY, JSON.stringify(finalSeries));
  await LocalStorage.setItem(SYNCED_AT_KEY, String(Date.now()));
  await lowerCoveredFrom(recentStart);
  return { series: finalSeries, requestsMade: 1 };
}

/**
 * User-triggered backfill: fetch the older chunks needed so the stored history
 * covers the last `days` days, walking backward from the current covered edge.
 * Not TTL-gated (an explicit action). Returns the series and how many requests
 * it actually fired (matches `pendingRequestsForWindow` at call time).
 */
export async function ensureWindow(
  apiKey: string,
  days: number,
): Promise<{ series: GoldSeries; requestsMade: number }> {
  const stored = pruneOldEntries(await loadStoredSeries());
  const windowStart = windowStartFor(days);
  const boundary = (await getCoveredFrom()) ?? todayIso();

  if (windowStart >= boundary) {
    // Already covered; record the (no-op) intent so the marker stays consistent.
    await lowerCoveredFrom(windowStart);
    return { series: stored, requestsMade: 0 };
  }

  const chunks = splitIntoChunks(windowStart, addDays(boundary, -1), MAX_TIMESERIES_RANGE_DAYS);
  const merged: GoldSeries = { ...stored };
  let requestsMade = 0;
  for (const chunk of chunks) {
    const points = await fetchTimeseriesGoldUsd(apiKey, chunk.start, chunk.end);
    requestsMade += 1;
    for (const point of points) {
      merged[point.date] = point.pricePerTroyOunceUsd;
    }
  }

  const finalSeries = pruneOldEntries(merged);
  await LocalStorage.setItem(SERIES_KEY, JSON.stringify(finalSeries));
  await lowerCoveredFrom(windowStart);
  return { series: finalSeries, requestsMade };
}

/** A period average in USD/toz (the canonical unit), before currency conversion. */
export interface PeriodAverageUsd {
  /** Window length in days (30/90/180/365). */
  days: number;
  /** Mean gold price per troy ounce in USD over the window, or null if no data. */
  averagePerTroyOunceUsd: number | null;
  /** Number of daily data points that fell inside the window. */
  sampleCount: number;
}

/** The averaging windows we surface, labelled by the UI as 1M/3M/6M/1Y. */
export const AVERAGE_WINDOWS_DAYS = [30, 90, 180, 365] as const;

/** Compute the mean per-troy-ounce USD price over each averaging window. */
export function computeAverages(series: GoldSeries): PeriodAverageUsd[] {
  const today = todayIso();
  const entries = Object.entries(series);
  return AVERAGE_WINDOWS_DAYS.map((days) => {
    const cutoff = addDays(today, -days + 1);
    const inWindow = entries.filter(([date]) => date >= cutoff && date <= today).map(([, price]) => price);
    const sampleCount = inWindow.length;
    const averagePerTroyOunceUsd =
      sampleCount > 0 ? inWindow.reduce((sum, price) => sum + price, 0) / sampleCount : null;
    return { days, averagePerTroyOunceUsd, sampleCount };
  });
}
