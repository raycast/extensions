import { LocalStorage } from "@raycast/api";
import type { StorageAdapter } from "./state";

/** Storage adapter backed by Raycast's LocalStorage. */
export const raycastStorage: StorageAdapter = {
  async getItem(key: string) {
    return await LocalStorage.getItem<string>(key);
  },
  async setItem(key: string, value: string) {
    await LocalStorage.setItem(key, value);
  },
};
