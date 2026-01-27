import { Cache } from "@raycast/api";

import { cacheTtl } from "@/helpers/preferences";

interface CacheEntry<T> {
  createdAt: number;
  data: T;
}

class CacheHelper {
  private cache = new Cache();

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  get<T>(key: string): T | null {
    if (cacheTtl <= 0) {
      return null;
    }
    const entryString = this.cache.get(key);
    if (!entryString) {
      return null;
    }
    const entry: CacheEntry<T> = JSON.parse(entryString);
    const isExpired = Date.now() - entry.createdAt > cacheTtl * 1000;
    if (isExpired) {
      this.cache.remove(key);
    }

    return isExpired ? null : entry.data;
  }

  set<T>(key: string, value: T): void {
    if (cacheTtl <= 0) {
      return;
    }

    const entry: CacheEntry<T> = {
      createdAt: Date.now(),
      data: value,
    };
    this.cache.set(key, JSON.stringify(entry));
  }

  remove(key: string): void {
    this.cache.remove(key);
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cachedData = this.get<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }
    const data = await fetcher();
    this.set<T>(key, data);
    return data;
  }

  async upsert<T extends { id: unknown }>(key: string, updater: (currentData: T[] | null) => Promise<T>): Promise<T> {
    const currentData = this.get<T[]>(key);
    const updatedEntry = await updater(currentData);

    if (currentData) {
      const idx = currentData.findIndex((entry) => entry.id === updatedEntry.id);
      if (idx !== -1) {
        currentData[idx] = updatedEntry;
      } else {
        currentData.push(updatedEntry);
      }
      this.set<T[]>(key, currentData);
    }

    return updatedEntry;
  }

  async removeItem<T extends { id: unknown }>(key: string, id: unknown): Promise<void> {
    const currentData = this.get<T[]>(key);
    if (currentData) {
      const updatedData = currentData.filter((entry) => entry.id !== id);
      this.set<T[]>(key, updatedData);
    }
  }
}

export const cacheHelper = new CacheHelper();
