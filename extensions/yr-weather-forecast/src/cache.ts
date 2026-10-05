import { LocalStorage } from "@raycast/api";

type CacheEntry<T> = {
  savedAtMs: number;
  value: T;
};

const KEY_PREFIX = "cache:";

export async function getCached<T>(key: string, ttlMs: number): Promise<T | undefined> {
  try {
    const raw = await LocalStorage.getItem<string>(KEY_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.savedAtMs !== "number") return undefined;
    const age = Date.now() - parsed.savedAtMs;
    if (age > ttlMs) return undefined;
    return parsed.value;
  } catch {
    return undefined;
  }
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  const entry: CacheEntry<T> = { savedAtMs: Date.now(), value };
  await LocalStorage.setItem(KEY_PREFIX + key, JSON.stringify(entry));
}

/**
 * Remove a single cached entry.
 */
export async function removeCached(key: string): Promise<void> {
  await LocalStorage.removeItem(KEY_PREFIX + key);
}

/**
 * Remove all cached entries whose internal cache key starts with `prefix`.
 * Returns number of removed entries.
 */
export async function clearCachedByPrefix(prefix: string): Promise<number> {
  const all = await LocalStorage.allItems();
  const storagePrefix = KEY_PREFIX + prefix;
  const keys = Object.keys(all).filter((k) => k.startsWith(storagePrefix));
  await Promise.all(keys.map((k) => LocalStorage.removeItem(k)));
  return keys.length;
}

/**
 * Remove all cached entries created by this extension (only keys under `cache:`).
 * Returns number of removed entries.
 */
export async function clearAllCached(): Promise<number> {
  const all = await LocalStorage.allItems();
  const keys = Object.keys(all).filter((k) => k.startsWith(KEY_PREFIX));
  await Promise.all(keys.map((k) => LocalStorage.removeItem(k)));
  return keys.length;
}
