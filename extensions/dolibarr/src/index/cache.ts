import { Cache } from "@raycast/api";
import type { SearchIndex } from "./loadIndex";

const CACHE_KEY = "dolibarr-index";
const SCHEMA_VERSION = 1;

type CachedIndex = {
  version: number;
  fetchedAt: number;
  index: SearchIndex;
};

const cache = new Cache();

/** Thirdparty and Contact hold only strings, numbers and null, so JSON round-trips losslessly. */
export function readIndex(): SearchIndex | null {
  const raw = cache.get(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedIndex;
    if (parsed.version !== SCHEMA_VERSION) return null;
    return parsed.index;
  } catch {
    return null;
  }
}

export function writeIndex(index: SearchIndex): void {
  const payload: CachedIndex = { version: SCHEMA_VERSION, fetchedAt: Date.now(), index };
  cache.set(CACHE_KEY, JSON.stringify(payload));
}

export function clearIndex(): void {
  cache.remove(CACHE_KEY);
}
