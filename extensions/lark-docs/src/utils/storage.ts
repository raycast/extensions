import { LocalStorage } from "@raycast/api";

export const StorageKey = {
  Session: "SPACE_SESSION",
  DocsRecentList: "DOCS_RECENT_LIST",
} as const;

export async function setStorage<T>(key: string, value: T): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function getStorage<T>(key: string): Promise<T | null> {
  const value = await LocalStorage.getItem<string>(key);
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function clearAuthStorage(): Promise<void> {
  await Promise.all([LocalStorage.removeItem(StorageKey.Session), LocalStorage.removeItem(StorageKey.DocsRecentList)]);
}
