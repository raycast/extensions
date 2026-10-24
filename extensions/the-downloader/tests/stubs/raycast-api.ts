// Test stub for `@raycast/api`. The real package ships only TypeScript types
// (its package.json has no `main`/`module`/`exports`), so vite/vitest cannot
// resolve it as a runtime module. vitest.config.ts aliases `@raycast/api` to
// this stub so the unit-tested modules (utils.ts, transcript.ts, …) can be
// imported. It provides just the surface those modules touch at import/use
// time. Extend as more modules come under test.

export const environment = {
  supportPath: "/tmp/the-downloader-test",
  assetsPath: "/tmp/the-downloader-test/assets",
};

const preferences: Record<string, unknown> = {
  downloadPath: "~/Downloads",
  networkIdleTimeoutSec: "120",
};

export function getPreferenceValues<T = Record<string, unknown>>(): T {
  return preferences as T;
}

// In-memory LocalStorage (string values only, like the real one for our use).
const storage = new Map<string, string>();

export const LocalStorage = {
  async getItem<T = string>(key: string): Promise<T | undefined> {
    return storage.get(key) as T | undefined;
  },
  async setItem(key: string, value: string): Promise<void> {
    storage.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    storage.delete(key);
  },
  async clear(): Promise<void> {
    storage.clear();
  },
};

// Enum-like namespaces resolve every member to its own name, e.g. Color.Blue === "Blue".
const names = new Proxy({}, { get: (_target, key) => String(key) }) as Record<string, string>;
export const Color = names;
export const Icon = names;

// In-memory Cache, one map per namespace like the real on-disk cache.
const caches = new Map<string, Map<string, string>>();

export class Cache {
  private readonly store: Map<string, string>;
  constructor(options: { namespace?: string } = {}) {
    const ns = options.namespace ?? "";
    if (!caches.has(ns)) caches.set(ns, new Map());
    this.store = caches.get(ns) as Map<string, string>;
  }
  get(key: string): string | undefined {
    return this.store.get(key);
  }
  set(key: string, value: string): void {
    this.store.set(key, value);
  }
  has(key: string): boolean {
    return this.store.has(key);
  }
  remove(key: string): boolean {
    return this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}
