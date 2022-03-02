import { StorageKey } from "../../constnat";
import { LocalStorage } from "@raycast/api";

export const get = <T = any>(key: StorageKey, defaultValue: T): Promise<T> => {
  return LocalStorage.getItem(key)
    .then((value) => value ?? defaultValue)
    .then((value) => {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }
      return value;
    });
};
