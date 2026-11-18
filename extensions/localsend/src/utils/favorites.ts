import { LocalStorage } from "@raycast/api";
import { FavoriteDevice, LocalSendDevice } from "../types";

const FAVORITES_KEY = "favorite-devices";

export const getFavoriteDevices = async (): Promise<FavoriteDevice[]> => {
  const stored = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as FavoriteDevice[];
  } catch {
    return [];
  }
};

export const addFavoriteDevice = async (device: LocalSendDevice): Promise<void> => {
  const favorites = await getFavoriteDevices();

  const existing = favorites.find((f) => f.fingerprint === device.fingerprint);
  if (existing) {
    return;
  }

  const newFavorite: FavoriteDevice = {
    fingerprint: device.fingerprint,
    alias: device.alias,
    ip: device.ip,
    addedAt: Date.now(),
  };

  favorites.push(newFavorite);
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

export const removeFavoriteDevice = async (fingerprint: string): Promise<void> => {
  const favorites = await getFavoriteDevices();
  const filtered = favorites.filter((f) => f.fingerprint !== fingerprint);
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
};

export const isFavoriteDevice = async (fingerprint: string): Promise<boolean> => {
  const favorites = await getFavoriteDevices();
  return favorites.some((f) => f.fingerprint === fingerprint);
};

export const toggleFavoriteDevice = async (device: LocalSendDevice): Promise<boolean> => {
  const isFav = await isFavoriteDevice(device.fingerprint);

  if (isFav) {
    await removeFavoriteDevice(device.fingerprint);
    return false;
  } else {
    await addFavoriteDevice(device);
    return true;
  }
};
