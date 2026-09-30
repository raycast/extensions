/**
 * Minimal stand-in for `@raycast/api` used by unit tests (wired up via the
 * vitest alias in vitest.config.ts). Only the surface imported by the lib
 * modules under test is implemented.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const store = new Map<string, string>();

export const LocalStorage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    return store.get(key) as T | undefined;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
};

/** Test hook: wipe LocalStorage between tests. */
export function __resetLocalStorage(): void {
  store.clear();
}

export const environment = {
  supportPath: mkdtempSync(join(tmpdir(), "descript-raycast-test-")),
};

export function getPreferenceValues<T>(): T {
  return { descriptApiToken: "test-token" } as T;
}

// `jobs.ts` only uses these as accessory values, so string stand-ins suffice.
export const Color = new Proxy({} as Record<string, string>, {
  get: (_target, prop) => String(prop),
});

export const Icon = new Proxy({} as Record<string, string>, {
  get: (_target, prop) => String(prop),
});
