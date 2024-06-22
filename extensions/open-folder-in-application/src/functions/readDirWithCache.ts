import { cacheDuration } from "@constants/cacheDuration";
import * as fs from "fs";
import { CacheEntry } from "@interfaces/cacheEntry";

const cache: { [key: string]: CacheEntry } = {};

export const readDirWithCache = (dir: string): string[] => {
  const now = Date.now();

  if (cache[dir] && now - cache[dir].timestamp < cacheDuration) {
    return cache[dir].data;
  }

  try {
    const data = fs.readdirSync(dir);

    cache[dir] = {
      timestamp: now,
      data: data,
    };

    return data;
  } catch (error) {
    return [];
  }
};
