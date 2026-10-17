import { Cache } from "@raycast/api";
import type { StorageLike } from "./cache";

export function createSyncedStorage(): StorageLike {
  const cache = new Cache();
  return {
    getItem: (key) => cache.get(key) ?? null,
    setItem: (key, value) => cache.set(key, value),
    removeItem: (key) => cache.remove(key),
  };
}
