import { environment, trash } from "@raycast/api";
import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { Cache, State } from "swr";

const CACHE_KEY = "swr-cache";

export async function clearCache() {
  return await trash(resolve(environment.supportPath, CACHE_KEY));
}

export function cacheProvider() {
  const path = resolve(environment.supportPath, CACHE_KEY);

  let map: Map<string, unknown>;
  try {
    const cache = readFileSync(path, { encoding: "utf-8" });
    // console.log("Loaded cache", cache.length, "bytes", cache);
    map = new Map(cache ? JSON.parse(cache.toString()) : null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    if (e?.code !== "ENOENT") {
      console.error("Failed reading cache", e);
    }
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
  const cache: Cache<typeof map> = {
    get: (key: string) => map.get(key) as State<typeof map>,
    set: (key: string, value: unknown) => {
      map.set(key, value);
      storeCache();
    },
    delete: (key: string) => {
      const existed = map.delete(key);
      storeCache();
      return existed;
    },
    keys: () => map.keys(),
  };

  return cache;
}
