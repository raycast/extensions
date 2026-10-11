import { LocalStorage } from "@raycast/api";

// Raycast's LocalStorage is per extension and survives updates: the sign-in token, the
// install id and the session guard live here. Values are stored as JSON strings.
export async function storageGet<T>(key: string): Promise<T | undefined> {
  const raw = await LocalStorage.getItem<string>(key);
  if (raw === undefined || raw === null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function storageRemove(key: string): Promise<void> {
  await LocalStorage.removeItem(key);
}
