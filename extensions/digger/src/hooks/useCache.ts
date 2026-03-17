import { LocalStorage } from "@raycast/api";
import { CacheEntry, DiggerResult } from "../types";
import { getCacheKey } from "../utils/urlUtils";
import { CACHE } from "../utils/config";

interface CacheIndex {
  keys: string[];
  lastAccessed: Record<string, number>;
}

async function getCacheIndex(): Promise<CacheIndex> {
  const indexStr = await LocalStorage.getItem<string>(CACHE.INDEX_KEY);
  if (!indexStr) {
    return { keys: [], lastAccessed: {} };
  }
  return JSON.parse(indexStr);
}

async function saveCacheIndex(index: CacheIndex): Promise<void> {
  await LocalStorage.setItem(CACHE.INDEX_KEY, JSON.stringify(index));
}

async function evictLRU(): Promise<void> {
  const index = await getCacheIndex();

  if (index.keys.length >= CACHE.MAX_ENTRIES) {
    const sortedKeys = index.keys.sort((a, b) => {
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

  const saveToCache = async (url: string, data: DiggerResult): Promise<void> => {
    await evictLRU();

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
