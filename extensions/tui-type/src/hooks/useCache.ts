import { Cache } from "@raycast/api";

const cache = new Cache();

export const useCache = () => {
  const getCached = <T>(key: string, fallback: T): T => {
    const val = cache.get(key);
    return val ? JSON.parse(val) : fallback;
  };

  const setCached = <T>(key: string, value: T) => {
    cache.set(key, JSON.stringify(value));
  };

  const removeCached = (key: string) => {
    cache.remove(key);
  };

  const clearCache = () => {
    cache.clear();
  };

  return { getCached, setCached, removeCached, clearCache };
};
