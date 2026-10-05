import { LocalStorage } from "@raycast/api";
import { StoredDevice } from "./types";

const STORED_DEVICES_KEY = "stored-devices";

export async function getStoredDevices(): Promise<StoredDevice[]> {
  const raw = await LocalStorage.getItem<string>(STORED_DEVICES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredDevice[];
  } catch {
    return [];
  }
}

async function saveStoredDevices(devices: StoredDevice[]): Promise<void> {
  await LocalStorage.setItem(STORED_DEVICES_KEY, JSON.stringify(devices));
}

export async function markConnected(id: string, name: string): Promise<void> {
  const devices = await getStoredDevices();
  const existing = devices.find((d) => d.id === id);
  if (existing) {
    existing.lastConnected = Date.now();
  } else {
    devices.push({ id, name, isFavorite: false, lastConnected: Date.now() });
  }
  await saveStoredDevices(devices);
}

export async function toggleFavorite(id: string, name: string): Promise<boolean> {
  const devices = await getStoredDevices();
  const existing = devices.find((d) => d.id === id);

  if (existing) {
    existing.isFavorite = !existing.isFavorite;
    // Enforce single favorite: unfavorite all others when setting a new favorite
    if (existing.isFavorite) {
      for (const d of devices) {
        if (d.id !== id) d.isFavorite = false;
      }
    }
    await saveStoredDevices(devices);
    return existing.isFavorite;
  } else {
    // Unfavorite all others
    for (const d of devices) {
      d.isFavorite = false;
    }
    devices.push({ id, name, isFavorite: true });
    await saveStoredDevices(devices);
    return true;
  }
}

export async function getFavoriteDeviceName(): Promise<string | undefined> {
  const devices = await getStoredDevices();
  const favorite = devices.find((d) => d.isFavorite);
  return favorite?.name;
}

export async function removeFromHistory(id: string): Promise<void> {
  const devices = await getStoredDevices();
  const filtered = devices.filter((d) => d.id !== id);
  await saveStoredDevices(filtered);
}
