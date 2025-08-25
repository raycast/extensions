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
