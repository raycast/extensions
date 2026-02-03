/**
 * Simple LRU (Least Recently Used) cache implementation.
 * Evicts oldest entries when capacity is exceeded.
 */
export class LruCache<V> {
  constructor(
    private maxSize: number,
    private cache = new Map<string, V>(),
  ) {}

  get(key: string): V | undefined {
    const value = this.cache.get(key);
    if (value === undefined) return undefined;
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}
