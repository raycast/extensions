import { Value } from "@raycast/api/types/api/app/localStorage";
import { StorageKey } from "../../constnat";
import { LocalStorage } from "@raycast/api";

export const set = <T = any>(key: StorageKey, value: T) => {
  if (typeof value === "object") {
    return LocalStorage.setItem(key, JSON.stringify(value));
  } else {
    return LocalStorage.setItem(key, value as unknown as Value);
  }
};
