import { Cache } from "@raycast/api";

/**
 * Pure acceleration — every entry can be dropped at any time and the next run
 * just refetches. Keys carry the shape version (see INDEX_VERSION), so entries
 * written by an older build are never read back.
 */
const cache = new Cache({ namespace: "open-slide-index" });

export function readCache<T>(key: string): T | null {
  const raw = cache.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown): void {
  cache.set(key, JSON.stringify(value));
}

export function clearCache(): void {
  cache.clear({ notifySubscribers: false });
}
