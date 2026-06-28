import { LocalStorage } from "@raycast/api";

interface CacheEntry<T> {
  expiresAt: number;
  payload: T;
}

export async function getCachedValue<T>(key: string): Promise<T | undefined> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > parsed.expiresAt) {
      await LocalStorage.removeItem(key);
      return undefined;
    }

    return parsed.payload;
  } catch {
    await LocalStorage.removeItem(key);
    return undefined;
  }
}

export async function setCachedValue<T>(key: string, payload: T, ttlMs: number): Promise<void> {
  const entry: CacheEntry<T> = {
    expiresAt: Date.now() + ttlMs,
    payload,
  };

  await LocalStorage.setItem(key, JSON.stringify(entry));
}
