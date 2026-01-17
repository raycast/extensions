import { LocalStorage } from "@raycast/api";
import { CachedDevice } from "./types";

const DEVICE_CACHE_KEY = "tapo_cached_devices_v2";
const SELECTED_KEY = "tapo_selected_device_ids_v1";

type CacheShape = Record<string, CachedDevice>;

function now() {
  return Date.now();
}

export async function getCache(): Promise<CacheShape> {
  const raw = await LocalStorage.getItem<string>(DEVICE_CACHE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as CacheShape;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export async function getCachedDevice(deviceId: string): Promise<CachedDevice | null> {
  const cache = await getCache();
  return cache[deviceId] ?? null;
}

export async function setCachedDevice(device: CachedDevice) {
  const cache = await getCache();
  const next: CacheShape = {
    ...cache,
    [device.id]: {
      ...device,
      lastSeenAt: now(),
    },
  };
  await LocalStorage.setItem(DEVICE_CACHE_KEY, JSON.stringify(next));
}

export async function touchDevice(deviceId: string) {
  const cache = await getCache();
  const d = cache[deviceId];
  if (!d) return;
  d.lastSeenAt = now();
  await LocalStorage.setItem(DEVICE_CACHE_KEY, JSON.stringify(cache));
}

export async function clearCache() {
  await LocalStorage.removeItem(DEVICE_CACHE_KEY);
}

export async function getSelectedDeviceIds(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(SELECTED_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setSelectedDeviceIds(ids: string[]) {
  const normalized = Array.from(new Set(ids)).filter(Boolean);
  await LocalStorage.setItem(SELECTED_KEY, JSON.stringify(normalized));
}
