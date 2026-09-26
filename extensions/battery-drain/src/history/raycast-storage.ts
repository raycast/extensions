import { LocalStorage } from "@raycast/api";
import { KeyValueStorage } from "./store";

export const raycastStorage: KeyValueStorage = {
  getItem: (key) => LocalStorage.getItem<string>(key),
  setItem: (key, value) => LocalStorage.setItem(key, value),
};
