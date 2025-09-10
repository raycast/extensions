import { Cache } from "@raycast/api";

export interface CacheData<T> {
  data: T;
  timestamp: number;
}

export class CanvasCache {
  private cache: Cache;
  private ttl: number;

  constructor(ttlMinutes: number = 15) {
    this.cache = new Cache();
    this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.cache.has(key)) {
        return null;
      }

      const cached = this.cache.get(key);
      if (cached) {
        const parsed: CacheData<T> = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < this.ttl) {
          return parsed.data;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T): Promise<void> {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
      };
      this.cache.set(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn(`Failed to cache data for key ${key}:`, error);
    }
  }

  remove(key: string): void {
    this.cache.remove(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

// Pre-configured cache instances for different data types
export const coursesCache = new CanvasCache(15); // 15 minutes
export const assignmentsCache = new CanvasCache(10); // 10 minutes
export const gradesCache = new CanvasCache(5); // 5 minutes
