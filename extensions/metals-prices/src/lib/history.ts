/**
 * Builds and maintains a rolling daily price series (per troy ounce, in USD —
 * the API's native unit) for every supported metal in Raycast LocalStorage, then
 * derives period averages from it. Conversion to the display currency happens at
 * the call site so the stored history is currency-canonical and rate-independent.
 *
 * One `/timeseries` request returns every metal for every day it covers, so the
 * series is stored as `date -> { metal: usdPerTroyOunce }` and a single fetch
 * advances all four metals at once.
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
import { fetchTimeseriesMetalsUsd, MAX_TIMESERIES_RANGE_DAYS, MetalPrices } from "./api";
import { addDays, daysBetween, splitIntoChunks, todayIso } from "./dates";
import { METAL_KEYS, MetalKey } from "./metals";

const SERIES_KEY = "metals-series-usd-toz";
const SYNCED_AT_KEY = "metals-series-synced-at";
/**
 * Per metal, the earliest date (YYYY-MM-DD) we have *attempted* to fetch. This is
 * the authority for "how far back is loaded" — tracked by requested boundary, not
 * by the oldest returned data point, so weekend/holiday gaps at a window's edge
 * don't make a fully-loaded window look partially loaded. Stored per metal
 * because a migrated gold-only cache can reach further back than the rest.
 */
const COVERED_FROM_KEY = "metals-covered-from";

/** Keys written by the gold-only version of this extension, migrated on first read. */
const LEGACY_SERIES_KEY = "gold-series-usd-toz";
const LEGACY_COVERED_FROM_KEY = "gold-history-covered-from";
const LEGACY_SYNCED_AT_KEY = "gold-series-synced-at";

/** How many days of history to keep (a bit over a year for the 12-month window). */
const HISTORY_DAYS = 370;
/** Default sync only keeps the most recent ~month fresh (one request, TTL-gated). */
const RECENT_WINDOW_DAYS = 30;
/** Re-sync history at most this often (ms). Keeps daily opens near-free. */
const SYNC_TTL_MS = 12 * 60 * 60 * 1000;
/** Refetch a few trailing days each sync in case recent closes were revised. */
const REFRESH_OVERLAP_DAYS = 3;

/** date (YYYY-MM-DD) -> per-metal price per troy ounce in USD. */
export type MetalSeries = Record<string, MetalPrices>;

/** metal -> earliest date we've attempted to fetch for it. */
export type CoveredFrom = Partial<Record<MetalKey, string>>;

/**
 * Convert a cache written by the gold-only version into the multi-metal shape,
 * so an upgrading user keeps the history they already spent quota on instead of
 * re-fetching it. Only gold's coverage marker carries over — the other metals
 * genuinely have no history yet, and claiming otherwise would let a long window
 * report an average built from a handful of recent days.
 */
async function migrateLegacySeriesIfNeeded(): Promise<void> {
  const existing = await LocalStorage.getItem<string>(SERIES_KEY);
  if (existing) return;
  const legacyRaw = await LocalStorage.getItem<string>(LEGACY_SERIES_KEY);
  if (!legacyRaw) return;

  let legacy: Record<string, number>;
  try {
    legacy = JSON.parse(legacyRaw) as Record<string, number>;
  } catch {
    await LocalStorage.removeItem(LEGACY_SERIES_KEY);
    return;
  }

  const migrated: MetalSeries = {};
  for (const [date, price] of Object.entries(legacy)) {
    if (typeof price === "number") migrated[date] = { gold: price };
  }
  const dates = Object.keys(migrated).sort();
  const legacyCoveredFrom = (await LocalStorage.getItem<string>(LEGACY_COVERED_FROM_KEY)) || dates[0];

  await LocalStorage.setItem(SERIES_KEY, JSON.stringify(migrated));
  if (legacyCoveredFrom) {
    await LocalStorage.setItem(COVERED_FROM_KEY, JSON.stringify({ gold: legacyCoveredFrom } satisfies CoveredFrom));
  }
  // Not migrating the sync timestamp is deliberate: the next open should fire one
  // request so the other three metals immediately get their recent window.
  await LocalStorage.removeItem(LEGACY_SERIES_KEY);
  await LocalStorage.removeItem(LEGACY_COVERED_FROM_KEY);
  await LocalStorage.removeItem(LEGACY_SYNCED_AT_KEY);
}

export async function loadStoredSeries(): Promise<MetalSeries> {
  await migrateLegacySeriesIfNeeded();
  const raw = await LocalStorage.getItem<string>(SERIES_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as MetalSeries;
  } catch {
    return {};
  }
}

/** Drop entries older than the retention window so storage stays bounded. */
function pruneOldEntries(series: MetalSeries): MetalSeries {
  const cutoff = addDays(todayIso(), -HISTORY_DAYS);
  const pruned: MetalSeries = {};
  for (const [date, prices] of Object.entries(series)) {
    if (date >= cutoff) pruned[date] = prices;
  }
  return pruned;
}

/** The per-metal coverage markers, or an empty map if none are recorded yet. */
async function readCoveredFrom(): Promise<CoveredFrom> {
  await migrateLegacySeriesIfNeeded();
  const raw = await LocalStorage.getItem<string>(COVERED_FROM_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CoveredFrom;
  } catch {
    return {};
  }
}

/**
 * Extend the covered range backward to `date` for each metal that actually came
 * back in the fetched days (never forward — only lowers). Marking *every*
 * returned metal, not just the one the user asked for, is what keeps a backfill
 * from being paid for twice: one request fills all four, so switching metals
 * afterwards must not re-offer a window that is already on disk.
 */
async function lowerCoveredFrom(metals: Iterable<MetalKey>, date: string): Promise<void> {
  const current = await readCoveredFrom();
  const next: CoveredFrom = { ...current };
  for (const metal of metals) {
    const existing = next[metal];
    if (!existing || date < existing) next[metal] = date;
  }
  await LocalStorage.setItem(COVERED_FROM_KEY, JSON.stringify(next));
}

/** Every metal that appears at least once across the given days. */
function metalsPresentIn(points: Array<{ prices: MetalPrices }>): Set<MetalKey> {
  const present = new Set<MetalKey>();
  for (const point of points) {
    for (const key of METAL_KEYS) {
      if (typeof point.prices[key] === "number") present.add(key);
    }
  }
  return present;
}

/** The oldest stored date that carries a price for `metal`, or null. */
function oldestDateFor(series: MetalSeries, metal: MetalKey): string | null {
  const dates = Object.entries(series)
    .filter(([, prices]) => typeof prices[metal] === "number")
    .map(([date]) => date)
    .sort();
  return dates.length > 0 ? dates[0] : null;
}

/**
 * The earliest date the stored history covers for a metal. Prefers the explicit
 * marker; when it is absent it falls back to the oldest stored date carrying that
 * metal, so a pre-existing full history isn't re-offered as "not loaded".
 */
export async function getCoveredFrom(metal: MetalKey): Promise<string | null> {
  const marker = (await readCoveredFrom())[metal];
  if (marker) return marker;
  return oldestDateFor(await loadStoredSeries(), metal);
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

/** Merge fetched days into the series without dropping metals already stored. */
function mergePoints(series: MetalSeries, points: Array<{ date: string; prices: MetalPrices }>): MetalSeries {
  const merged: MetalSeries = { ...series };
  for (const point of points) {
    // Per-metal merge, not a wholesale replace: a migrated day may hold only
    // gold, and a response may omit a metal — neither should erase the other.
    merged[point.date] = { ...merged[point.date], ...point.prices };
  }
  return merged;
}

/**
 * Keep the most recent ~30 days fresh: at most one `/timeseries` request, gated
 * by the 12h TTL (bypassed with `force`). This is all a normal open costs, and it
 * refreshes every metal at once.
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
): Promise<{ series: MetalSeries; requestsMade: number }> {
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

  const points = await fetchTimeseriesMetalsUsd(apiKey, fetchStart, today);
  const finalSeries = pruneOldEntries(mergePoints(stored, points));

  await LocalStorage.setItem(SERIES_KEY, JSON.stringify(finalSeries));
  await LocalStorage.setItem(SYNCED_AT_KEY, String(Date.now()));
  await lowerCoveredFrom(metalsPresentIn(points), recentStart);
  return { series: finalSeries, requestsMade: 1 };
}

/**
 * User-triggered backfill: fetch the older chunks needed so `metal`'s stored
 * history covers the last `days` days, walking backward from that metal's current
 * covered edge. Not TTL-gated (an explicit action). Returns the series and how
 * many requests it actually fired (matches `pendingRequestsForWindow` at call
 * time). Every other metal in the fetched days is filled and marked too, so the
 * same window is never paid for a second time from another metal's row.
 */
export async function ensureWindow(
  apiKey: string,
  metal: MetalKey,
  days: number,
): Promise<{ series: MetalSeries; requestsMade: number }> {
  const stored = pruneOldEntries(await loadStoredSeries());
  const windowStart = windowStartFor(days);
  const boundary = (await getCoveredFrom(metal)) ?? todayIso();

  if (windowStart >= boundary) {
    // Already covered; record the (no-op) intent so the marker stays consistent.
    await lowerCoveredFrom([metal], windowStart);
    return { series: stored, requestsMade: 0 };
  }

  const chunks = splitIntoChunks(windowStart, addDays(boundary, -1), MAX_TIMESERIES_RANGE_DAYS);
  const fetched: Array<{ date: string; prices: MetalPrices }> = [];
  let requestsMade = 0;
  for (const chunk of chunks) {
    const points = await fetchTimeseriesMetalsUsd(apiKey, chunk.start, chunk.end);
    requestsMade += 1;
    fetched.push(...points);
  }

  const finalSeries = pruneOldEntries(mergePoints(stored, fetched));
  await LocalStorage.setItem(SERIES_KEY, JSON.stringify(finalSeries));
  // The requested metal is always marked (even if the API returned nothing for
  // it) so a dead window can't be re-requested forever; the others are marked
  // only when they actually came back.
  await lowerCoveredFrom(new Set<MetalKey>([metal, ...metalsPresentIn(fetched)]), windowStart);
  return { series: finalSeries, requestsMade };
}

/** A period average in USD/toz (the canonical unit), before currency conversion. */
export interface PeriodAverageUsd {
  /** Window length in days (30/90/180/365). */
  days: number;
  /** Mean price per troy ounce in USD over the window, or null if no data. */
  averagePerTroyOunceUsd: number | null;
  /** Number of daily data points that fell inside the window. */
  sampleCount: number;
}

/** The averaging windows we surface, labelled by the UI as 1M/3M/6M/1Y. */
export const AVERAGE_WINDOWS_DAYS = [30, 90, 180, 365] as const;

/** Compute one metal's mean per-troy-ounce USD price over each averaging window. */
export function computeAverages(series: MetalSeries, metal: MetalKey): PeriodAverageUsd[] {
  const today = todayIso();
  const entries = Object.entries(series)
    .map(([date, prices]) => [date, prices[metal]] as const)
    .filter((entry): entry is readonly [string, number] => typeof entry[1] === "number");

  return AVERAGE_WINDOWS_DAYS.map((days) => {
    const cutoff = addDays(today, -days + 1);
    const inWindow = entries.filter(([date]) => date >= cutoff && date <= today).map(([, price]) => price);
    const sampleCount = inWindow.length;
    const averagePerTroyOunceUsd =
      sampleCount > 0 ? inWindow.reduce((sum, price) => sum + price, 0) / sampleCount : null;
    return { days, averagePerTroyOunceUsd, sampleCount };
  });
}

/** The most recent stored close for a metal (USD/toz) strictly before today. */
export function previousCloseUsd(series: MetalSeries, metal: MetalKey): number | null {
  const today = todayIso();
  const priorDates = Object.entries(series)
    .filter(([date, prices]) => date < today && typeof prices[metal] === "number")
    .map(([date]) => date)
    .sort();
  const last = priorDates[priorDates.length - 1];
  return last ? (series[last][metal] as number) : null;
}
