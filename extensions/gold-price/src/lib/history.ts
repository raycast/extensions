/**
 * Builds and maintains a rolling ~1-year daily gold-price series (per troy
 * ounce, in USD — the API's native unit) in Raycast LocalStorage, then derives
 * period averages from it. Conversion to the display currency happens at the
 * call site so the stored history is currency-canonical and rate-independent.
 *
 * The series is fetched incrementally to respect the 100-request/month free
 * tier: on first run the full year is pulled in ~13 chunks; afterwards only the
 * days since the last sync are refetched (usually a single request), and the
 * whole sync is skipped entirely while the cache is younger than the TTL.
 */

import { LocalStorage } from "@raycast/api";
import { fetchTimeseriesGoldUsd, MAX_TIMESERIES_RANGE_DAYS } from "./api";
import { addDays, daysBetween, splitIntoChunks, todayIso } from "./dates";

const SERIES_KEY = "gold-series-usd-toz";
const SYNCED_AT_KEY = "gold-series-synced-at";

/** How many days of history to keep (a bit over a year for the 12-month window). */
const HISTORY_DAYS = 370;
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

/**
 * Ensure the stored series covers the last ~year up to today, fetching only
 * what is missing. Pass `force` to bypass the TTL (e.g. a manual refresh).
 * Returns the series plus how many API requests this call actually made.
 */
export async function syncSeries(
  apiKey: string,
  options: { force?: boolean } = {},
): Promise<{ series: GoldSeries; requestsMade: number }> {
  const stored = pruneOldEntries(await loadStoredSeries());
  const today = todayIso();
  const windowStart = addDays(today, -HISTORY_DAYS + 1);

  const syncedAtRaw = await LocalStorage.getItem<string>(SYNCED_AT_KEY);
  const syncedAt = syncedAtRaw ? Number(syncedAtRaw) : 0;
  const isFresh = !options.force && Date.now() - syncedAt < SYNC_TTL_MS;

  // Determine the range still needed. Start from just after the newest cached
  // day (minus an overlap to catch revisions), or the window start if empty.
  const cachedDates = Object.keys(stored).sort();
  const newestCached = cachedDates.length > 0 ? cachedDates[cachedDates.length - 1] : undefined;
  let fetchStart = newestCached ? addDays(newestCached, -REFRESH_OVERLAP_DAYS) : windowStart;
  if (fetchStart < windowStart) fetchStart = windowStart;

  const hasGap = !newestCached || daysBetween(newestCached, today) > 0;
  if (isFresh || !hasGap) {
    return { series: stored, requestsMade: 0 };
  }

  const chunks = splitIntoChunks(fetchStart, today, MAX_TIMESERIES_RANGE_DAYS);
  let requestsMade = 0;
  const merged: GoldSeries = { ...stored };
  for (const chunk of chunks) {
    const points = await fetchTimeseriesGoldUsd(apiKey, chunk.start, chunk.end);
    requestsMade += 1;
    for (const point of points) {
      merged[point.date] = point.pricePerTroyOunceUsd;
    }
  }

  const finalSeries = pruneOldEntries(merged);
  await LocalStorage.setItem(SERIES_KEY, JSON.stringify(finalSeries));
  await LocalStorage.setItem(SYNCED_AT_KEY, String(Date.now()));
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
