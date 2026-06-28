import { LocalStorage } from "@raycast/api";
import { LocalSendDevice } from "../types";

const CACHE_KEY = "discovered-devices";
const CACHE_EXPIRY_MS = 30000; // 30 seconds

interface CachedDeviceData {
  devices: LocalSendDevice[];
  timestamp: number;
}

export const getCachedDevices = async (): Promise<LocalSendDevice[]> => {
  const cached = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!cached) return [];

  const data: CachedDeviceData = JSON.parse(cached);
  const now = Date.now();

  if (now - data.timestamp > CACHE_EXPIRY_MS) {
    return [];
  }

  return data.devices;
};

export const setCachedDevices = async (devices: LocalSendDevice[]): Promise<void> => {
  const data: CachedDeviceData = {
    devices,
    timestamp: Date.now(),
  };
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(data));
};

export const clearCachedDevices = async (): Promise<void> => {
  await LocalStorage.removeItem(CACHE_KEY);
};
