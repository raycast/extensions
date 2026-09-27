import { LocalStorage } from "@raycast/api";

/**
 * JSON value stored under `key`, or `fallback` if unset or unreadable. A corrupt or truncated value is treated as
 * unset (and overwritten by the next write) so it can't break every command until the user clears extension data.
 */
export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}
