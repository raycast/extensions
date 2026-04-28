import { LocalStorage } from "@raycast/api";

/**
 * Persistent cache backed by Raycast LocalStorage.
 *
 * On first access, returns cached data from LocalStorage immediately,
 * then the caller can fetch fresh data in the background.
 * This means the UI shows data instantly on subsequent opens.
 */
export class ResourceCache {
  /**
   * Gets cached data from LocalStorage.
   * Returns null if no cached data exists for the key.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await LocalStorage.getItem<string>(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Stores data in LocalStorage. TTL is not enforced here —
   * the data persists until explicitly invalidated or overwritten.
   * The caller decides when to refresh.
   */
  async set<T>(key: string, data: T): Promise<void> {
    try {
      await LocalStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Silently fail — cache is best-effort
    }
  }

  /**
   * Removes a specific entry from the cache.
   */
  async invalidate(key: string): Promise<void> {
    try {
      await LocalStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  }

  /**
   * Removes all cached entries.
   */
  async clear(): Promise<void> {
    try {
      await LocalStorage.clear();
    } catch {
      // Silently fail
    }
  }
}
