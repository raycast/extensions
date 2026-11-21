import { LocalStorage } from "@raycast/api";
import type { KeyValueStore } from "../core/usage";

export const localStore: KeyValueStore = {
  getItem: (key) => LocalStorage.getItem<string>(key),
  setItem: (key, value) => LocalStorage.setItem(key, value),
};
