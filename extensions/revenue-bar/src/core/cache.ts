/**
 * Cache keys and lifetimes in one place.
 *
 * - Provider data goes through `useCachedPromise` (keyed by the hook's arguments, kept between launches) with
 *   `keepPreviousData`, so the last result stays on screen while a refresh runs.
 * - Exchange rates and the selected range live in the Raycast `Cache` under the keys below.
 * - The license state lives in `LocalStorage` (see src/license).
 */
export const CACHE_KEYS = {
  fxRates: (base: string) => `fx-rates-${base}`,
  selectedRange: "selected-range",
  license: "license-state-v1",
} as const;

export const TTL = {
  fx: 24 * 60 * 60 * 1000,
  licenseRevalidate: 7 * 24 * 60 * 60 * 1000,
  licenseOfflineGrace: 14 * 24 * 60 * 60 * 1000,
} as const;

/** Minimal synchronous string store. Production uses Raycast's `Cache`; tests use a Map. */
export interface KeyValueStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const map = new Map(Object.entries(initial));
  return {
    get: (key) => map.get(key),
    set: (key, value) => void map.set(key, value),
    remove: (key) => void map.delete(key),
  };
}

export function readJson<T>(store: KeyValueStore, key: string, guard: (value: unknown) => value is T): T | undefined {
  const raw = store.get(key);
  if (raw === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  store.set(key, JSON.stringify(value));
}
