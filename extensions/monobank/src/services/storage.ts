import { LocalStorage } from "@raycast/api";

/**
 * A value cached in LocalStorage. `lastUpdated` is when it was last fetched (or last attempted), and `scope`
 * identifies the credentials it belongs to, when it depends on them.
 */
export type Cached<T> = T & { lastUpdated: number; scope?: string };

/** Reads JSON stored under `key`, in the same format as `useLocalStorage`. Unreadable values count as missing. */
export async function readJson<T>(key: string): Promise<T | undefined> {
  const json = await LocalStorage.getItem<string>(key);
  if (!json) return undefined;

  try {
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}

export async function writeJson(key: string, value: unknown) {
  await LocalStorage.setItem(key, JSON.stringify(value));
}
