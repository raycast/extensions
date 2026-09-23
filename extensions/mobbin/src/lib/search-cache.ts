import { abortError } from "./errors";
import { waitForAbortable } from "./request";
import type {
  AuthMode,
  MobbinReference,
  SearchClient,
  SearchOptions,
} from "./types";

const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHE_ENTRIES = 30;

type CacheEntry = {
  expiresAt: number;
  results: MobbinReference[];
};

type InFlightEntry = {
  controller: AbortController;
  promise: Promise<MobbinReference[]>;
  consumers: Set<symbol>;
  settled: boolean;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, InFlightEntry>();

export function searchCacheKey(
  authMode: AuthMode,
  options: SearchOptions,
): string {
  return JSON.stringify({
    authMode,
    ...options,
    query: options.query.trim().toLowerCase(),
    excludeScreenIds: [...options.excludeScreenIds].sort(),
  });
}

function setCache(key: string, results: MobbinReference[]): void {
  cache.delete(key);
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, results });
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

export async function searchWithCache(
  client: SearchClient,
  authMode: AuthMode,
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<MobbinReference[]> {
  if (signal?.aborted) throw abortError(signal.reason);
  const key = searchCacheKey(authMode, options);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    cache.delete(key);
    cache.set(key, cached);
    return cached.results;
  }
  if (cached) cache.delete(key);

  const existing = inFlight.get(key);
  if (existing && !existing.controller.signal.aborted)
    return consumeInFlight(existing, signal);
  if (existing) inFlight.delete(key);

  const controller = new AbortController();
  const entry: InFlightEntry = {
    controller,
    consumers: new Set(),
    settled: false,
    promise: Promise.resolve([]),
  };
  entry.promise = client
    .search(options, controller.signal)
    .then((results) => {
      if (controller.signal.aborted) throw abortError(controller.signal.reason);
      setCache(key, results);
      return results;
    })
    .finally(() => {
      entry.settled = true;
      if (inFlight.get(key) === entry) inFlight.delete(key);
    });
  inFlight.set(key, entry);
  return consumeInFlight(entry, signal);
}

function consumeInFlight(
  entry: InFlightEntry,
  signal?: AbortSignal,
): Promise<MobbinReference[]> {
  const consumer = Symbol("search-consumer");
  entry.consumers.add(consumer);
  return waitForAbortable(entry.promise, signal).finally(() => {
    entry.consumers.delete(consumer);
    if (entry.consumers.size === 0 && !entry.settled) entry.controller.abort();
  });
}

export function clearSearchCache(): void {
  cache.clear();
  for (const entry of inFlight.values()) entry.controller.abort();
  inFlight.clear();
}

export function getSearchCacheSize(): number {
  return cache.size;
}
