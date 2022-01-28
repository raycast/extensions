import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from "@raycast/api";

export const SERVICES_KEY = "services";
export const APPS_KEY = "apps";
export const REQUEST_ID = "requestId";
export const DEVICE_ID = "deviceId";
export const SECRET_SEED = "secretSeed";
export const AUTHY_ID = "authyId";

export async function checkIfCached(key: string): Promise<boolean> {
  return (await getLocalStorageItem(key)) != undefined;
}

export async function getFromCache<T>(key: string): Promise<T> {
  const fromCache = await getLocalStorageItem<string>(key);
  if (fromCache != undefined) {
    return JSON.parse(fromCache);
  } else {
    throw new Error(`${key} not found`);
  }
}

export async function addToCache(key: string, value: object | string | number | boolean): Promise<void> {
  return await setLocalStorageItem(key, JSON.stringify(value));
}

export async function removeFromCache(key: string): Promise<void> {
  return await removeLocalStorageItem(key);
}
