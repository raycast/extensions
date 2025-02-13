/* eslint-disable class-methods-use-this */
import { Cache } from "@raycast/api";
import { SyncStorage } from "jotai/vanilla/utils/atomWithStorage";

export const cache = new Cache();

export class JotaiCacheStorage<T> implements SyncStorage<T> {
  getItem(key: string, initialValue: T): T {
    const item = cache.get(key);
    if (item === undefined) {
      return initialValue;
    }

    if (typeof initialValue === "string") {
      return item as T;
    }

    return JSON.parse(item) as T;
  }

  setItem(key: string, newValue: T) {
    if (typeof newValue === "string") {
      cache.set(key, newValue);
    } else {
      cache.set(key, JSON.stringify(newValue));
    }
  }

  removeItem(key: string) {
    cache.remove(key);
  }
}
