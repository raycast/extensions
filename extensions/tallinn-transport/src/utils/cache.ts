import { Cache } from "@raycast/api";

export type CacheManagerOptions = {
  key: string;
  duration?: number;
};

const DEFAULT_CACHE_MANAGER_OPTIONS = {
  duration: 1000 * 60 * 15,
};

export class CacheManager<T> {
  private cache: Cache;
  private options: Required<CacheManagerOptions>;

  constructor(options: CacheManagerOptions) {
    this.cache = new Cache();
    this.options = { ...DEFAULT_CACHE_MANAGER_OPTIONS, ...options };
  }

  get(): T | null {
    const cachedData = this.cache.get(this.options.key);
    const timestamp = this.cache.get(`${this.options.key}-timestamp-key`);

    if (cachedData && timestamp) {
      const isExpired = Date.now() - Number(timestamp) > this.options.duration;
      if (!isExpired) {
        return JSON.parse(cachedData);
      }
    }

    return null;
  }

  set(data: T) {
    this.cache.set(this.options.key, JSON.stringify(data));
    this.cache.set(`${this.options.key}-timestamp-key`, Date.now().toString());
  }
}
