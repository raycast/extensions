import { LocalStorage } from "@raycast/api";
import { BooxDevice } from "../models/boox";

const DEVICE_CACHE_KEY = "boox.default-device";

export async function readCachedDevice(): Promise<BooxDevice | undefined> {
  const value = await LocalStorage.getItem<string>(DEVICE_CACHE_KEY);
  if (!value) return undefined;
  try {
    return JSON.parse(value) as BooxDevice;
  } catch {
    await LocalStorage.removeItem(DEVICE_CACHE_KEY);
    return undefined;
  }
}

export async function writeCachedDevice(device: BooxDevice): Promise<void> {
  await LocalStorage.setItem(DEVICE_CACHE_KEY, JSON.stringify(device));
}

export async function clearCachedDevice(): Promise<void> {
  await LocalStorage.removeItem(DEVICE_CACHE_KEY);
}
