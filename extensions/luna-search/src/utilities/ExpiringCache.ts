import { Cache } from "@raycast/api";

/**
 * Represents an expiring entry in the cache, containing the entity
 * and the epoch time (in seconds) when the entry will expire.
 */
interface ExpiringEntry<T> {
  epochTTL: number;
  entity: T;
}

/**
 * Get the current epoch time in seconds.
 * @returns The current epoch time in seconds.
 */
function getEpochTimeSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * An expiring cache implementation that uses the Raycast Cache API.
 * The cache stores entries with a specified time-to-live (TTL) in seconds.
 * When retrieving an entry, the cache checks if the entry has expired
 * and returns the entity if it has not.
 */
export class ExpiringCache<T> {
  readonly cache: Cache;
  readonly ttl_s: number;

  private static cacheInstance: Cache;

  private static getCacheInstance(): Cache {
    if (!this.cacheInstance) {
      ExpiringCache.cacheInstance = new Cache();
    }
    return ExpiringCache.cacheInstance;
  }

  /**
   * Constructs a new instance of the ExpiringCache.
   * The TTL (time-to-live) for the cache entries can be specified,
   * and defaults to 300 seconds (5 minutes) if not provided.
   *
   * @param ttl_s The time-to-live for the cache entries, in seconds.
   */
  constructor(ttl_s = 300) {
    this.cache = ExpiringCache.getCacheInstance();
    this.ttl_s = ttl_s;
  }

  /**
   * Retrieves an entry from the cache, if it exists and has not expired.
   *
   * @param key The key used to store the entry in the cache.
   * @returns The entity stored in the cache, or undefined if the entry does not exist or has expired.
   */
  public get(key: string): T | undefined {
    const result = this.cache.get(key);
    if (!result) {
      return undefined;
    }

    const deserializedResult = JSON.parse(result) as ExpiringEntry<T>;
    if (deserializedResult.epochTTL <= getEpochTimeSeconds()) {
      this.cache.remove(key);
      return undefined;
    }

    return deserializedResult.entity;
  }

  /**
   * Stores an entry in the cache with the specified key and time-to-live.
   *
   * @param key The key to use for storing the entry.
   * @param entity The entity to store in the cache.
   */
  public set(key: string, entity: T): void {
    const entry: ExpiringEntry<T> = {
      epochTTL: getEpochTimeSeconds() + this.ttl_s,
      entity,
    };
    this.cache.set(key, JSON.stringify(entry));
  }
}
