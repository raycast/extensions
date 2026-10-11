// First-run and recovery rules for the tracked app list (SPEC.md §5.3). Pure: takes a key-value store and an
// installed-apps reader so the four-row table is tested with an in-memory store (acceptance row M-1).
//
// | apps.v1  | setup.v1 | Result                                                    |
// | missing  | missing  | never configured: seed defaults, write both keys, "seeded" |
// | []       | any      | deliberately empty: no seed, no write, no toast            |
// | missing  | present  | configured before, key gone: [], no write, warning         |
// | corrupt  | any      | reseed defaults, "reseeded-corrupt" toast                  |
import {
  parseSelection,
  seedSelection,
  serializeSelection,
  STORAGE_KEY,
  type InstalledApp,
  type SelectedApp,
} from "./badge/config.ts";
import type { KeyValueStore } from "./badge/views.ts";

export const SETUP_STORAGE_KEY = "setup.v1";

export type AppsNotice = "seeded" | "reseeded-corrupt" | "missing-after-setup";
export type LoadedApps = { apps: SelectedApp[]; notice?: AppsNotice };

export const MISSING_AFTER_SETUP_TOAST_TITLE = "Badge tracking list was missing; no badges are tracked";
export const RESEEDED_TOAST_TITLE = "Saved app selection was unreadable, so defaults were restored";
export const SEEDED_TOAST = {
  title: "Badge tracking the default apps",
  message: "Manage Pinned Apps (⌘⇧C) to add, remove, reorder, or pin",
};

/** `setup.v1` is "present" for any stored value; its content only records when the seed ran. */
export function setupPresent(raw: unknown): boolean {
  return raw !== undefined;
}

export function serializeSetup(seededAt: string): string {
  return JSON.stringify({ seededAt });
}

export async function loadAppsFrom(
  store: KeyValueStore,
  installed: () => Promise<InstalledApp[]>,
  now: () => string = () => new Date().toISOString(),
): Promise<LoadedApps> {
  const parsed = parseSelection(await store.getItem(STORAGE_KEY));
  if (parsed.status === "ok") return { apps: parsed.apps };
  const setup = setupPresent(await store.getItem(SETUP_STORAGE_KEY));
  if (parsed.status === "missing" && setup) return { apps: [], notice: "missing-after-setup" };
  const apps = seedSelection(await installed());
  await store.setItem(STORAGE_KEY, serializeSelection(apps));
  if (!setup) await store.setItem(SETUP_STORAGE_KEY, serializeSetup(now()));
  return { apps, notice: parsed.status === "corrupt" ? "reseeded-corrupt" : "seeded" };
}
