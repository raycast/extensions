import { Cache } from "@raycast/api";

const cache = new Cache();

export function getCache(name: string) {
  const value = cache.get(name);
  return value ? JSON.parse(value) : null;
}

export function setCache(name: string, value: object) {
  cache.set(name, JSON.stringify(value));
}

export function clearCache() {
  cache.clear();
}
