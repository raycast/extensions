import { LocalStorage } from "@raycast/api";

export async function getLocalStorageItem(key: string): Promise<string | undefined> {
  return await LocalStorage.getItem(key);
}

export async function setLocalStorageItem(key: string, value: string): Promise<void> {
  await LocalStorage.setItem(key, value);
}
