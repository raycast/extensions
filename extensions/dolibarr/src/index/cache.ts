import { Cache } from "@raycast/api";
import { getConfig } from "../preferences";
import { indexCacheKey } from "./cacheKey";
import type { SearchIndex } from "./loadIndex";

const SCHEMA_VERSION = 1;

type CachedIndex = {
  version: number;
  fetchedAt: number;
  index: SearchIndex;
};

const cache = new Cache();

/**
 * Read at call time rather than once at module load: preferences can change between two runs of a
 * command, and a stale key would hand back another instance's index.
 */
function currentKey(): string {
  const { baseUrl, apiKey } = getConfig();
  return indexCacheKey(baseUrl, apiKey);
}

/** Thirdparty and Contact hold only strings, numbers and null, so JSON round-trips losslessly. */
export function readIndex(): SearchIndex | null {
  const raw = cache.get(currentKey());
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
  cache.set(currentKey(), JSON.stringify(payload));
}
