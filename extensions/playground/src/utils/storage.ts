import { LocalStorage } from "@raycast/api";

export const PRIVATE_KEY = "privateKey";
export const MRU_DOMAIN = "domain";
export const API_URL = "apiUrl";

export async function checkIfStored(key: string): Promise<boolean> {
  return (await LocalStorage.getItem(key)) != undefined;
}

export async function getFromStore<T>(key: string): Promise<T> {
  const fromStore = await LocalStorage.getItem<string>(key);
  if (fromStore != undefined) {
    return JSON.parse(fromStore);
  } else {
    throw new Error(`${key} not found`);
  }
}

export async function getFromStoreOrDefault<T>(key: string, defaultValue: T): Promise<T> {
  const fromStore = await LocalStorage.getItem<string>(key);
  if (fromStore != undefined) {
    return JSON.parse(fromStore);
  } else {
    return defaultValue;
  }
}

export async function addToStore(key: string, value: object | string | number | boolean): Promise<void> {
  return await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function removeFromStore(key: string): Promise<void> {
  return await LocalStorage.removeItem(key);
}
