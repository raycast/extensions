import { environment } from "@raycast/api";
import { Cache } from "@raycast/api";
import path from "path";
import { createFileAdapter, type StorageAdapter } from "zod-persist";

export function createRaycastFileAdapter(fileName: string) {
  const filePath = path.join(environment.supportPath, fileName);
  return createFileAdapter(filePath);
}

export function createCacheAdapter(namespace = "default"): StorageAdapter {
  const cache = new Cache({ namespace });

  return {
    name: `@raycast/api->Cache(${namespace})`,
    async getItem(key: string) {
      return cache.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      cache.set(key, value);
    },
  };
}
