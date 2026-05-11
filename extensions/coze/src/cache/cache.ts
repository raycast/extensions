import { Cache } from "@raycast/api";

const cache = new Cache();

export const getCache = <T>(key: string): T | undefined => {
  try {
    const value = cache.get(key);
    if (!value) return undefined;

    return JSON.parse(value) as T;
  } catch (err) {
    console.error("Failed to parse cached value:", err);
    return undefined;
  }
};

export const setCache = <T>(key: string, value: T) => {
  try {
    cache.set(key, JSON.stringify(value));
  } catch (err) {
    console.error("Failed to set cache:", err);
  }
};
