import { environment, trash } from "@raycast/api";
import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { Cache, Key } from "swr";

const CACHE_KEY = "swr-cache";

export async function clearCache() {
  return await trash(resolve(environment.supportPath, CACHE_KEY));
}

export function cacheProvider() {
  const path = resolve(environment.supportPath, CACHE_KEY);

  let map: Map<Key, unknown>;
  try {
    const cache = readFileSync(path, { encoding: "utf-8" });
    map = new Map(cache ? JSON.parse(cache.toString()) : null);
  } catch (e) {
    console.error("Failed reading cache", e);
    map = new Map();
    storeCache();
  }

  async function storeCache() {
    try {
      const data = JSON.stringify(Array.from(map.entries()));
      await writeFile(path, data, { encoding: "utf-8" });
    } catch (e) {
      console.error("Failed persisting cache", e);
    }
  }

  const cache: Cache = {
    get: (key: Key) => map.get(key),
    set: (key: Key, value: unknown) => {
      map.set(key, value);
      storeCache();
    },
    delete: (key: Key) => {
      const existed = map.delete(key);
      storeCache();
      return existed;
    },
  };

  return cache;
}
