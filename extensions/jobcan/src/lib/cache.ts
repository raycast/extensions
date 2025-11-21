import { LocalStorage } from "@raycast/api";
import { CACHE_TTL } from "./constants";

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Cache key generator
 */
export const CACHE_KEYS = {
  attendance: (year: number, month: number) => `jobcan_attendance_${year}_${month}`,
} as const;

/**
 * Get cached data if it exists and is not expired
 */
export async function getCached<T>(key: string, ttl: number = CACHE_TTL.ATTENDANCE): Promise<T | null> {
  try {
    const cached = await LocalStorage.getItem<string>(key);
    if (!cached) {
      return null;
    }

    const parsed: CachedData<T> = JSON.parse(cached);
    const now = Date.now();
    const age = now - parsed.timestamp;

    if (age > ttl) {
      // Cache expired, remove it
      await LocalStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Set cached data with timestamp
 */
export async function setCached<T>(key: string, data: T): Promise<void> {
  const cached: CachedData<T> = {
    data,
    timestamp: Date.now(),
  };
  await LocalStorage.setItem(key, JSON.stringify(cached));
}

/**
 * Remove cached data
 */
export async function removeCached(key: string): Promise<void> {
  await LocalStorage.removeItem(key);
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<void> {
  const allItems = await LocalStorage.allItems();
  for (const key of Object.keys(allItems)) {
    if (key.startsWith("jobcan_")) {
      await LocalStorage.removeItem(key);
    }
  }
}
