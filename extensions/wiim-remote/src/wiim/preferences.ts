import { getPreferenceValues, LocalStorage } from "@raycast/api";

interface WiiMPreferences {
  wiim_device_ip?: string;
  wiim_volume_step?: string;
}

const STORAGE_KEYS = {
  CACHED_IP: "wiim_cached_device_ip",
  CACHE_TIME: "wiim_discovery_cache_time",
  SELECTED_IP: "wiim_selected_device_ip",
};

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get device IP from user preferences (manually configured).
 * Returns undefined if not set.
 */
export function getManualDeviceIP(): string | undefined {
  const prefs = getPreferenceValues<WiiMPreferences>();
  const ip = prefs.wiim_device_ip?.trim();
  return ip || undefined;
}

/**
 * Get volume step from user preferences (1–50, default 5).
 */
export function getVolumeStep(): number {
  const prefs = getPreferenceValues<WiiMPreferences>();
  const parsed = prefs.wiim_volume_step ? parseInt(prefs.wiim_volume_step, 10) : 5;
  return Math.max(1, Math.min(50, isNaN(parsed) ? 5 : parsed));
}

/**
 * Get auto-discovered IP from LocalStorage cache.
 */
export async function getCachedDeviceIP(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(STORAGE_KEYS.CACHED_IP);
  return value ?? undefined;
}

/**
 * Store auto-discovered device IP in LocalStorage with a timestamp.
 */
export async function setCachedDeviceIP(ip: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.CACHED_IP, ip);
  await LocalStorage.setItem(STORAGE_KEYS.CACHE_TIME, Date.now().toString());
}

/**
 * Clear the auto-discovery cache (e.g., after a discovery failure).
 */
export async function clearCachedDeviceIP(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.CACHED_IP);
  await LocalStorage.removeItem(STORAGE_KEYS.CACHE_TIME);
}

/**
 * Check whether the discovery cache is still valid (within 30-minute TTL).
 */
export async function isCacheValid(): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.CACHE_TIME);
  if (!raw) return false;
  const cachedAt = parseInt(raw, 10);
  return !isNaN(cachedAt) && Date.now() - cachedAt < CACHE_TTL;
}

/**
 * Get selected device IP from LocalStorage (user-selected via select-device command).
 */
export async function getSelectedDeviceIP(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(STORAGE_KEYS.SELECTED_IP);
  return value ?? undefined;
}

/**
 * Store user-selected device IP in LocalStorage.
 */
export async function setSelectedDeviceIP(ip: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.SELECTED_IP, ip);
}

/**
 * Clear the selected device.
 */
export async function clearSelectedDeviceIP(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.SELECTED_IP);
}
