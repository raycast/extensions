/**
 * The slice of `@raycast/api` the extension's lib modules touch, standing in
 * for the Raycast runtime.
 *
 * Raycast is closed-source and offers no way to drive an extension's UI from a
 * test, so the end-to-end coverage here goes through the extension's real
 * modules — its Supabase client, auth, dictionary search, and card writes —
 * against the local Supabase stack. Only the rendering is unverified, and that
 * is what the manual checklist in E2E.md covers.
 *
 * Aliased in place of the real package by `e2e/vitest.config.ts`.
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_PUBLISHABLE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

/**
 * A stand-in assets directory holding the same `local-config.json` a developer
 * writes by hand, so `constants.ts` resolves the local stack through its real
 * code path rather than a test-only branch.
 */
const ASSETS_PATH = mkdtempSync(path.join(tmpdir(), "inoh-raycast-e2e-assets-"));
writeFileSync(
  path.join(ASSETS_PATH, "local-config.json"),
  JSON.stringify({
    supabaseUrl: LOCAL_SUPABASE_URL,
    supabasePublishableKey: LOCAL_PUBLISHABLE_KEY,
  }),
);

export const environment = {
  isDevelopment: true,
  assetsPath: ASSETS_PATH,
};

/** Raycast's per-extension key/value store; in-memory here. */
const localStorageEntries = new Map<string, string>();

export const LocalStorage = {
  getItem: async <T = string>(key: string): Promise<T | undefined> => localStorageEntries.get(key) as T | undefined,
  setItem: async (key: string, value: string | number | boolean): Promise<void> => {
    localStorageEntries.set(key, String(value));
  },
  removeItem: async (key: string): Promise<void> => {
    localStorageEntries.delete(key);
  },
};
