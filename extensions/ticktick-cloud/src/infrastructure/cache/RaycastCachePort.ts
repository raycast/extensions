import { createRequire } from "node:module";

import type { CachePort } from "./CachePort";

const CACHE_NAMESPACE = "ticktick.tasks.v1";
const INDEX_KEY = "__ticktick_cache_index_v1__";

interface CacheStore {
  get(key: string): string | undefined;
  has(key: string): boolean;
  set(key: string, value: string): void;
  remove(key: string): unknown;
  clear(): void;
}

type CacheFactory = (options: { namespace: string }) => CacheStore;

function defaultCacheFactory(options: { namespace: string }): CacheStore {
  const { Cache: RaycastCache } = createRequire(__filename)("@raycast/api") as typeof import("@raycast/api");
  return new RaycastCache(options);
}

export class RaycastCachePort implements CachePort {
  private readonly cache: CacheStore;

  constructor(factory: CacheFactory = defaultCacheFactory) {
    this.cache = factory({ namespace: CACHE_NAMESPACE });
  }

  get(key: string): string | undefined {
    if (key === INDEX_KEY) return undefined;
    const index = this.readIndex();
    if (!index) return this.recoverExact(key);
    const liveKeys = this.prune(index);
    if (liveKeys.includes(key)) return this.cache.get(key);
    return this.cache.has(key) ? this.recoverExact(key) : undefined;
  }

  set(key: string, value: string): void {
    if (key === INDEX_KEY) throw new Error("The cache index key is reserved.");
    const index = this.readIndex();
    const liveKeys = index ? this.prune(index) : this.reset();
    this.writeIndex(liveKeys.includes(key) ? liveKeys : [...liveKeys, key]);
    this.cache.set(key, value);
  }

  remove(key: string): void {
    if (key === INDEX_KEY) return;
    const index = this.readIndex();
    if (!index) {
      this.reset();
      return;
    }
    this.cache.remove(key);
    this.writeIndex(index.filter((indexedKey) => indexedKey !== key && this.cache.has(indexedKey)));
  }

  keys(): string[] {
    const index = this.readIndex();
    return index ? this.prune(index) : this.reset();
  }

  private readIndex(): string[] | undefined {
    const value = this.cache.get(INDEX_KEY);
    if (value === undefined) return undefined;
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        Array.isArray(parsed) &&
        parsed.every((key) => typeof key === "string" && key.length > 0 && key !== INDEX_KEY) &&
        new Set(parsed).size === parsed.length
      ) {
        return parsed;
      }
    } catch {
      // The index is disposable; callers see no unvalidated entries.
    }
    return undefined;
  }

  private prune(index: string[]): string[] {
    const liveKeys = index.filter((key) => this.cache.has(key));
    if (liveKeys.length !== index.length) this.writeIndex(liveKeys);
    return liveKeys;
  }

  private recoverExact(key: string): string | undefined {
    const value = this.cache.has(key) ? this.cache.get(key) : undefined;
    this.cache.clear();
    if (value === undefined) {
      this.writeIndex([]);
      return undefined;
    }
    this.cache.set(key, value);
    this.writeIndex([key]);
    return value;
  }

  private reset(): string[] {
    this.cache.clear();
    this.writeIndex([]);
    return [];
  }

  private writeIndex(keys: string[]): void {
    this.cache.set(INDEX_KEY, JSON.stringify(keys));
  }
}
