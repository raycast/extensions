import { LocalStorage } from "@raycast/api";

const PREF_PREFIX = "app_device_";

export async function getAppPreferredDevice(bundleId: string): Promise<string | undefined> {
  return await LocalStorage.getItem<string>(`${PREF_PREFIX}${bundleId}`);
}

export async function setAppPreferredDevice(bundleId: string, deviceUid: string): Promise<void> {
  await LocalStorage.setItem(`${PREF_PREFIX}${bundleId}`, deviceUid);
}

export async function removeAppPreferredDevice(bundleId: string): Promise<void> {
  await LocalStorage.removeItem(`${PREF_PREFIX}${bundleId}`);
}

export async function clearAllAppPreferredDevices(): Promise<void> {
  const items = await LocalStorage.allItems<LocalStorage.Values>();
  const keys = Object.keys(items).filter((key) => key.startsWith(PREF_PREFIX));
  await Promise.all(keys.map((key) => LocalStorage.removeItem(key)));
}
