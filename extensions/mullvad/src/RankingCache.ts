import { Cache } from "@raycast/api";
export default class RankingCache<T> {
  private cache: Cache;
  private defaultValue: T;

  constructor(cache: Cache, defaultValue: T) {
    this.cache = cache;
    this.defaultValue = defaultValue;
  }

  private stringify(value: T): string {
    if (value instanceof Set) {
      return JSON.stringify(Array.from(value));
    }
    return JSON.stringify(value);
  }

  private parse(value: string): T {
    try {
      const parsed = JSON.parse(value);
      if (this.defaultValue instanceof Set) return new Set(parsed) as T;
      return parsed;
    } catch {
      return this.defaultValue;
    }
  }

  public get(key: string): T {
    const storedValue = this.cache.get(key);
    return storedValue !== undefined ? this.parse(storedValue) : this.defaultValue;
  }

  public update(key: string, updater: (value: T) => T): void {
    const storedValue = this.cache.get(key);
    const oldValue = storedValue !== undefined ? this.parse(storedValue) : this.defaultValue;
    const newValue = updater(oldValue);
    this.cache.set(key, this.stringify(newValue));
  }
}
