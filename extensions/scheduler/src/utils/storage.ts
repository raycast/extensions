import { LocalStorage } from "@raycast/api";

export const parseStoredData = <T>(data: string | undefined, fallback: T): T => {
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
};

export async function getStoredData<T>(key: string, fallback: T): Promise<T> {
  const stored = await LocalStorage.getItem<string>(key);
  return parseStoredData(stored, fallback);
}

export async function setStoredData<T>(key: string, data: T): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(data));
}
