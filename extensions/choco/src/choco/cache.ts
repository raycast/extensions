import { Cache } from "@raycast/api";

const cache = new Cache();

const CACHE_KEYS = {
  installed: "choco:installed:v1",
  outdated: "choco:outdated:v1",
  sources: "choco:sources:v1",
  metadataPrefix: "choco:meta:v1:",
} as const;

interface TimedEntry<T> {
  timestamp: number;
  data: T;
}

export function getCachedValue<T>(
  key: string,
  maxAgeMs: number,
): T | undefined {
  const raw = cache.get(key);
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as TimedEntry<T>;
    if (Date.now() - parsed.timestamp > maxAgeMs) {
      return undefined;
    }
    return parsed.data;
  } catch {
    return undefined;
  }
}

export function setCachedValue<T>(key: string, data: T): void {
  const entry: TimedEntry<T> = {
    timestamp: Date.now(),
    data,
  };
  cache.set(key, JSON.stringify(entry));
}

export function invalidatePackageCaches(): void {
  cache.remove(CACHE_KEYS.installed);
  cache.remove(CACHE_KEYS.outdated);
}

export function invalidateSourceCache(): void {
  cache.remove(CACHE_KEYS.sources);
}

export { CACHE_KEYS };
