import { Cache } from "@raycast/api";

const cache = new Cache();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  try {
    const parsed: CacheEntry<T> = JSON.parse(entry);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      cache.remove(key);
      return null;
    }
    return parsed.data;
  } catch {
    cache.remove(key);
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  cache.set(key, JSON.stringify(entry));
}

export function clearCache(): void {
  cache.clear();
}

// Cache keys for different data types
export const CacheKeys = {
  items: (page: number, search?: string, itemType?: string) => {
    const parts = ["items", `page:${page}`];
    if (search) parts.push(`search:${search}`);
    if (itemType && itemType !== "all") parts.push(`type:${itemType}`);
    return parts.join(":");
  },
  arcs: "arcs",
  quests: (page: number) => `quests:page:${page}`,
  traders: "traders",
  eventTimers: "events-schedule",
};
