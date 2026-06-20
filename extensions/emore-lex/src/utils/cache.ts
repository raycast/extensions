import { LocalStorage } from "@raycast/api";

const CACHE_PREFIX = "cache:";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

export async function getCached<T>(key: string): Promise<T | undefined> {
  const raw = await LocalStorage.getItem<string>(CACHE_PREFIX + key);
  if (!raw) return undefined;

  try {
    const record = JSON.parse(raw) as CacheRecord<T>;
    if (Date.now() > record.expiresAt) {
      await LocalStorage.removeItem(CACHE_PREFIX + key);
      return undefined;
    }
    return record.value;
  } catch {
    await LocalStorage.removeItem(CACHE_PREFIX + key);
    return undefined;
  }
}

export async function setCached<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): Promise<void> {
  const record: CacheRecord<T> = {
    value,
    expiresAt: Date.now() + ttlMs,
  };
  await LocalStorage.setItem(CACHE_PREFIX + key, JSON.stringify(record));
}
