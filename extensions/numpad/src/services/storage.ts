import { LocalStorage } from "@raycast/api";

const key = "Numpad-Saves";

export const storeKey = (storage: string[]) => {
  return LocalStorage.setItem(key, JSON.stringify(storage));
};

export const removeKey = () => {
  return LocalStorage.removeItem(key);
};

export const getStorageKey = async () => {
  return JSON.parse((await LocalStorage.getItem(key)) ?? "[]");
};
