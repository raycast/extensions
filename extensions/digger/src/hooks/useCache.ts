import { LocalStorage } from "@raycast/api";
import { CacheEntry, DiggerResult } from "../types";
import { CACHE } from "../utils/config";
import { getCacheKey } from "../utils/urlUtils";

interface CacheIndex {
  keys: string[];
  lastAccessed: Record<string, number>;
}

async function getCacheIndex(): Promise<CacheIndex> {
  const indexStr = await LocalStorage.getItem<string>(CACHE.INDEX_KEY);

  // Validate the parsed shape rather than trusting it. This comes back from
  // LocalStorage, so the CacheIndex type is a claim about it, not a guarantee —
  // a truncated write leaves `keys` present and `lastAccessed` missing, and the
  // purge below would then throw mid-way, after deleting payloads.
  let index: CacheIndex = { keys: [], lastAccessed: {} };
  if (indexStr) {
    try {
      const parsed = JSON.parse(indexStr);
      index = {
        keys: Array.isArray(parsed?.keys) ? parsed.keys.filter((k: unknown): k is string => typeof k === "string") : [],
        lastAccessed: parsed?.lastAccessed && typeof parsed.lastAccessed === "object" ? parsed.lastAccessed : {},
      };
    } catch {
      // A corrupt index is not recoverable; start clean rather than throw into
      // the caller, which would surface a cache problem as a fetch failure.
    }
  }

  // Purge entries left by an older key version.
  //
  // Scanned from LocalStorage itself, not from `index.keys`: a payload write
  // that succeeded while the following index update did not leaves an orphan no
  // index-based sweep could ever find. Those would sit there forever — never
  // read (lookups build a current-prefix key) and never expired (the 48h check
  // only runs on a read that can no longer happen).
  const all = await LocalStorage.allItems();
  const stale = Object.keys(all).filter(
    (k) => k !== CACHE.INDEX_KEY && k.startsWith(CACHE.KEY_FAMILY) && !k.startsWith(CACHE.KEY_PREFIX),
  );
  if (stale.length === 0) return index;

  await Promise.all(stale.map((k) => LocalStorage.removeItem(k)));
  const staleSet = new Set(stale);
  index.keys = index.keys.filter((k) => !staleSet.has(k));
  for (const k of stale) delete index.lastAccessed[k];
  await saveCacheIndex(index);
  return index;
}

async function saveCacheIndex(index: CacheIndex): Promise<void> {
  await LocalStorage.setItem(CACHE.INDEX_KEY, JSON.stringify(index));
}

async function evictLRU(): Promise<void> {
  const index = await getCacheIndex();

  if (index.keys.length >= CACHE.MAX_ENTRIES) {
    const sortedKeys = [...index.keys].sort((a, b) => {
      const aAccessed = index.lastAccessed[a] || 0;
      const bAccessed = index.lastAccessed[b] || 0;
      return aAccessed - bAccessed;
    });

    const toRemove = sortedKeys[0];
    await LocalStorage.removeItem(toRemove);

    index.keys = index.keys.filter((k) => k !== toRemove);
    delete index.lastAccessed[toRemove];

    await saveCacheIndex(index);
  }
}

export function useCache() {
  const getFromCache = async (url: string): Promise<DiggerResult | null> => {
    const cacheKey = getCacheKey(url);
    const cached = await LocalStorage.getItem<string>(cacheKey);

    if (!cached) {
      return null;
    }

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();

    if (now - entry.timestamp > CACHE.DURATION_MS) {
      await LocalStorage.removeItem(cacheKey);
      return null;
    }

    entry.lastAccessed = now;
    await LocalStorage.setItem(cacheKey, JSON.stringify(entry));

    const index = await getCacheIndex();
    index.lastAccessed[cacheKey] = now;
    await saveCacheIndex(index);

    return entry.data;
  };

  /**
   * @param isCancelled Optional predicate re-checked after eviction, immediately
   *   before the write. `evictLRU` is a suspension point long enough for a newer
   *   fetch to start, abort this one, and persist its own entry first — after
   *   which this call would resume and overwrite that newer entry under the same
   *   key. Checking only before calling `saveToCache` cannot see that, because
   *   the supersession happens after the call has already begun.
   */
  const saveToCache = async (url: string, data: DiggerResult, isCancelled?: () => boolean): Promise<void> => {
    await evictLRU();
    if (isCancelled?.()) return;

    const cacheKey = getCacheKey(url);
    const now = Date.now();

    const entry: CacheEntry = {
      url,
      data,
      timestamp: now,
      lastAccessed: now,
    };

    await LocalStorage.setItem(cacheKey, JSON.stringify(entry));

    const index = await getCacheIndex();
    if (!index.keys.includes(cacheKey)) {
      index.keys.push(cacheKey);
    }
    index.lastAccessed[cacheKey] = now;
    await saveCacheIndex(index);
  };

  const clearCache = async (): Promise<void> => {
    const index = await getCacheIndex();

    for (const key of index.keys) {
      await LocalStorage.removeItem(key);
    }

    await LocalStorage.removeItem(CACHE.INDEX_KEY);
  };

  const refreshEntry = async (url: string): Promise<void> => {
    const cacheKey = getCacheKey(url);
    await LocalStorage.removeItem(cacheKey);

    const index = await getCacheIndex();
    index.keys = index.keys.filter((k) => k !== cacheKey);
    delete index.lastAccessed[cacheKey];
    await saveCacheIndex(index);
  };

  return {
    getFromCache,
    saveToCache,
    clearCache,
    refreshEntry,
  };
}
