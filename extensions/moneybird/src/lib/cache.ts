import { LocalStorage } from "@raycast/api";

type CachedList<T> = {
  items: T[];
  updatedAt: string;
};

const cacheTtlMs = 24 * 60 * 60 * 1000;

const isCacheFresh = (updatedAt: string | undefined) => {
  if (!updatedAt) return false;
  const updatedAtMs = new Date(updatedAt).getTime();
  if (!updatedAtMs) return false;
  return Date.now() - updatedAtMs <= cacheTtlMs;
};

export const cacheKey = (administrationId: string, key: "contacts" | "projects") =>
  `moneybird.${key}.${administrationId}`;

export const loadCachedList = async <T>(key: string) => {
  const cached = await LocalStorage.getItem<string>(key);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as CachedList<T>;
    if (!isCacheFresh(parsed.updatedAt)) return null;
    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch (error) {
    console.error("Failed to parse cache", error);
    return null;
  }
};

export const saveCachedList = async <T>(key: string, items: T[]) => {
  const payload: CachedList<T> = { items, updatedAt: new Date().toISOString() };
  await LocalStorage.setItem(key, JSON.stringify(payload));
};
