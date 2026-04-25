import { Cache } from "@raycast/api";

const cache = new Cache();

export function readCached<T>(key: string): T | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeCached<T>(key: string, value: T): void {
  cache.set(key, JSON.stringify(value));
}

export function clearCached(key: string): void {
  cache.remove(key);
}
