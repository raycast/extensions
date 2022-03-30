import { environment } from "@raycast/api";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { FunctionComponent, ReactNode } from "react";
import { Cache, Key, SWRConfig } from "swr";

const CACHE_KEY = "swr-cache";

const provider = (): Cache => {
  const path = resolve(environment.supportPath, CACHE_KEY);

  let map: Map<Key, unknown>;
  try {
    const cache = readFileSync(path, { encoding: "utf-8" });
    map = new Map(Object.entries(JSON.parse(cache)));
  } catch (e) {
    console.error("Failed reading cache", e);
    map = new Map();
  }

  const storeCache = () => {
    try {
      const data = JSON.stringify(Object.fromEntries(map));
      writeFileSync(path, data, { encoding: "utf-8" });
    } catch (e) {
      console.error("Failed persisting cache", e);
    }
  };

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
};

export const CacheProvider: FunctionComponent<{ children: ReactNode }> = ({ children }) => (
  <SWRConfig value={{ provider }}>{children}</SWRConfig>
);
