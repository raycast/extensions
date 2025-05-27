import { Cache } from "@raycast/api";

const cache = new Cache();

// Cache configuration
export const CACHE_TTL = {
  INSTANCES: 60 * 1000, // 1 minute for instances (status changes frequently)
  STORAGE: 5 * 60 * 1000, // 5 minutes for storage (changes less frequently)
  CLOUD_RUN: 2 * 60 * 1000, // 2 minutes for Cloud Run
  FUNCTIONS: 5 * 60 * 1000, // 5 minutes for functions
};

export interface CacheData<T> {
  data: T;
  timestamp: number;
}

export function getCachedData<T>(key: string, ttl: number): T | null {
  try {
    const cached = cache.get(key);
    if (!cached) return null;

    const cacheData: CacheData<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - cacheData.timestamp < ttl) {
      return cacheData.data;
    }

    // Cache expired, remove it
    cache.remove(key);
    return null;
  } catch {
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  const cacheData: CacheData<T> = {
    data,
    timestamp: Date.now(),
  };
  cache.set(key, JSON.stringify(cacheData));
}

export function clearCache(key?: string): void {
  if (key) {
    cache.remove(key);
  } else {
    cache.clear();
  }
}

// Helper to generate cache keys
export function getCacheKey(service: string, projectId: string): string {
  return `${service}:${projectId}`;
}
