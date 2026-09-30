import { LocalStorage } from "@raycast/api";
import { reportError } from "./report";

/**
 * JSON value stored under `key`, or `fallback` if unset or unreadable. A corrupt or truncated value is treated as
 * unset (and overwritten by the next write) so it can't break every command until the user clears extension data.
 */
export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    // Only Hopper writes these values: a corrupt one is a bug somewhere.
    reportError(error, `storage: ${key}`);
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}
