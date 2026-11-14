import { useEffect, useRef, useState } from "react";
import { Cached } from "../services/storage";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Fetches started in this command, by key and scope. Views that mount together (e.g. the statement and the
 * budget accounts in "Show Statement") share one request instead of each spending the rate limit.
 */
const pendingFetches = new Map<string, { promise: Promise<unknown>; startedAt: number }>();

type ForcedFetchListener = (pending: { promise: Promise<unknown>; startedAt: number }) => void;

/** Every instance by fetch key, so a fetch one of them forces (see `revalidate`) updates all of them. */
const forcedFetchListeners = new Map<string, Set<ForcedFetchListener>>();

/**
 * Data cached in LocalStorage and refetched once the cache is older than `ttl`.
 * On a failed fetch the cached data is kept, and `lastUpdated` is still bumped so
 * the next attempt waits for another `ttl`, unless `shouldRetryNextLaunch(error)` returns true.
 *
 * When `scope` is set (e.g. a fingerprint of the credentials), the cache is only returned if it
 * was stored under the same scope. A cache from another scope is never returned and is refetched
 * right away; it is only passed to `fetch` as `previous`, which must not expose it.
 */
export function usePersistedResource<T extends object>(options: {
  key: string;
  initialValue: T;
  ttl: number;
  scope?: string;
  fetch: (previous: T) => Promise<T>;
  shouldRetryNextLaunch?: (error: unknown) => boolean;
}) {
  const { key, initialValue, ttl, scope, fetch, shouldRetryNextLaunch } = options;
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<unknown>();
  const {
    data,
    setData,
    isLoading: isLoadingFromStorage,
  } = useLocalStorage<Cached<T>>(key, { ...initialValue, lastUpdated: 0 });

  const isOtherScope = scope !== undefined && data.scope !== scope;

  const fetchKey = `${key}|${scope ?? ""}`;

  /** Shows the result of `pending` once it settles. */
  function track(pending: { promise: Promise<unknown>; startedAt: number }) {
    setIsFetching(true);
    setError(undefined);

    (pending.promise as Promise<T>)
      .then((fresh) => setData({ ...fresh, lastUpdated: pending.startedAt, scope }))
      .catch((error) => {
        console.error(error);
        setError(error);
        if (!shouldRetryNextLaunch?.(error)) {
          setData((prev) => ({ ...prev, lastUpdated: pending.startedAt }));
        }
      })
      .finally(() => setIsFetching(false));
  }

  /** Fetches when the cache is stale, or always with `force`, which every instance with the same key then shows. */
  function load(force: boolean) {
    const now = Date.now();
    if (!force && !isOtherScope && now - data.lastUpdated <= ttl) return;

    let pending = pendingFetches.get(fetchKey);
    // A forced fetch doesn't reuse a pending one, which may be the failed fetch it retries.
    if (force || !pending || now - pending.startedAt > ttl) {
      pending = { promise: fetch(data), startedAt: now };
      pendingFetches.set(fetchKey, pending);
    }

    if (force) forcedFetchListeners.get(fetchKey)?.forEach((listener) => listener(pending));
    else track(pending);
  }

  // Runs once, right after the cached value has been read.
  useEffect(() => {
    if (!isLoadingFromStorage) load(false);
  }, [isLoadingFromStorage]);

  const latestTrack = useRef(track);
  latestTrack.current = track;

  useEffect(() => {
    const listener: ForcedFetchListener = (pending) => latestTrack.current(pending);
    const listeners = forcedFetchListeners.get(fetchKey) ?? new Set();
    listeners.add(listener);
    forcedFetchListeners.set(fetchKey, listeners);
    return () => {
      listeners.delete(listener);
    };
  }, [fetchKey]);

  return {
    data: isOtherScope ? initialValue : data,
    /** When the data was last fetched (or last attempted), in unix milliseconds. 0 before the first fetch. */
    lastUpdated: isOtherScope ? 0 : data.lastUpdated,
    setData,
    isLoading: isFetching || isLoadingFromStorage,
    /** Whether the cached value is still being read. Stays false while refetching. */
    isLoadingFromStorage,
    isError: error !== undefined,
    error,
    /** Fetches again now, whatever the cache's age, e.g. to retry a failed fetch. */
    revalidate: () => load(true),
  };
}
