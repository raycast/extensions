import { Cache } from "@raycast/api";
import { fetchDay, fetchRange } from "./ultrahuman";
import { DailyMetrics, DailyMetricsRange } from "./types";

const cache = new Cache({ namespace: "ultrahuman-insights" });
const TTL_MS = 5 * 60 * 1000;
const STALE_MAX_MS = 24 * 60 * 60 * 1000;

interface Entry<T> {
  data: T;
  fetchedAt: number;
}

// De-dupe concurrent fetches for the same key
const inflight = new Map<string, Promise<Memoized<unknown>>>();

export interface Memoized<T> {
  data: T;
  /** True when we returned cached data after a network failure. */
  stale: boolean;
}

async function memoize<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<Memoized<T>> {
  const raw = cache.get(key);
  let cached: Entry<T> | null = null;
  if (raw) {
    try {
      cached = JSON.parse(raw) as Entry<T>;
    } catch {
      // Corrupted entry — treat as no entry
      cached = null;
    }
  }

  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return { data: cached.data, stale: false };
  }

  // Check inflight de-dupe
  const existing = inflight.get(key);
  if (existing) {
    return existing as Promise<Memoized<T>>;
  }

  const promise = fetcher()
    .then((data) => {
      cache.set(key, JSON.stringify({ data, fetchedAt: Date.now() }));
      return { data, stale: false } as Memoized<T>;
    })
    .catch((e) => {
      if (cached) {
        if (Date.now() - cached.fetchedAt > STALE_MAX_MS) {
          throw e;
        }
        return { data: cached.data, stale: true } as Memoized<T>;
      }
      throw e;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise as Promise<Memoized<unknown>>);
  return promise;
}

export function getDay(date: string): Promise<Memoized<DailyMetrics>> {
  return memoize(`daily:${date}`, () => fetchDay(date));
}

export function getRange(
  startEpoch: number,
  endEpoch: number,
): Promise<Memoized<DailyMetricsRange>> {
  return memoize(`range:${startEpoch}:${endEpoch}`, () =>
    fetchRange(startEpoch, endEpoch),
  );
}

/** Force a refresh for one day on next read. */
export function clearDay(date: string): void {
  cache.remove(`daily:${date}`);
}

/** Force a refresh for a range on next read. */
export function clearRange(startEpoch: number, endEpoch: number): void {
  cache.remove(`range:${startEpoch}:${endEpoch}`);
}

/** Wipe everything. Useful for a "Reset cache" debug action. */
export function clearAll(): void {
  cache.clear();
}
