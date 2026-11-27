interface CacheEntry {
  value: string;
  expiresAt: number;
}

// LRU + TTL cache. Relies on Map preserving insertion order: a key is moved
// to the most-recent position by `delete`-then-`set`, and the oldest is the
// first key returned by `keys().next()`. This keeps every op O(1).
export class Cache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(ttlSeconds = 60, maxEntries = 128) {
    this.defaultTtlMs = ttlSeconds * 1000;
    this.maxEntries = maxEntries;
  }

  get(key: string): string | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  put(key: string, value: string): void {
    if (this.store.has(key)) this.store.delete(key);
    else if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.defaultTtlMs });
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const globalCache = new Cache(60, 128);
