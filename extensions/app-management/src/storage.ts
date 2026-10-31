// Configuration persistence in this extension's own LocalStorage (SPEC.md §5.3). Only the configuration keys (plus the
// utility pins of §9) are ever written; badge values and window titles never are, and window IDs only in the hotkey
// selection (selection.v1). Composes the badge project's pin and filter loaders with the new first-run rules and the
// recency store.
import { getApplications, LocalStorage, showToast, Toast } from "@raycast/api";
import { serializeSelection, STORAGE_KEY, type SelectedApp } from "./lib/badge/config.ts";
import {
  loadPinsFrom,
  loadViewFrom,
  PINS_STORAGE_KEY,
  serializePins,
  VIEW_STORAGE_KEY,
  type ListView,
  type LoadedPins,
} from "./lib/badge/views.ts";
import type { ListConfig } from "./lib/rows.ts";
import {
  loadAppsFrom,
  MISSING_AFTER_SETUP_TOAST_TITLE,
  RESEEDED_TOAST_TITLE,
  SEEDED_TOAST,
  type AppsNotice,
} from "./lib/setup.ts";
import {
  parseRecent,
  parseSort,
  RECENT_STORAGE_KEY,
  serializeRecent,
  SORT_STORAGE_KEY,
  stampRecent,
  type RecentMap,
  type SortMode,
} from "./lib/sort.ts";

import { parseUtilityPins, serializeUtilityPins, UTILITY_PINS_STORAGE_KEY, type UtilityId } from "./lib/utilities.ts";
import {
  actionableSelection,
  LIST_STATE_STORAGE_KEY,
  parseListState,
  parseSelection,
  SELECTION_STORAGE_KEY,
  type StoredSelection,
} from "./lib/selection.ts";
import { serialQueue } from "./lib/serial.ts";

/**
 * Writes go through queues so quick successive writes land in call order (see lib/serial.ts). The hotkey commands read
 * the selection and list state from another process and cannot wait on these queues, so those two keys get queues of
 * their own: a selection save never waits behind a settings or recency write.
 */
const writeSelection = serialQueue();
const writeListState = serialQueue();
const write = serialQueue();

/**
 * The list writes its selection and open/closed state so the hotkey commands can act on the selected row. Both stamp
 * `at` when called, not when the queued write runs: the hotkey compares the two stamps, so they must keep the order in
 * which the selection and the close happened, even if a write finishes late.
 */
export async function saveSelection(selection: Omit<StoredSelection, "at">): Promise<void> {
  const value = JSON.stringify({ ...selection, at: Date.now() });
  await writeSelection(() => LocalStorage.setItem(SELECTION_STORAGE_KEY, value));
}

/** A selected Trash or status row is not an app: the hotkey quit commands must refuse rather than act on the app that
 * was selected before it. */
export async function clearSelection(): Promise<void> {
  await writeSelection(() => LocalStorage.removeItem(SELECTION_STORAGE_KEY));
}

/** A mount writes "open"; its unmount writes "closed" only if no newer mount has written since. */
export async function saveListState(open: boolean, id: string): Promise<void> {
  const at = Date.now();
  await writeListState(async () => {
    if (!open) {
      const current = parseListState(await LocalStorage.getItem(LIST_STATE_STORAGE_KEY));
      if (current?.id && current.id !== id) return;
    }
    await LocalStorage.setItem(LIST_STATE_STORAGE_KEY, JSON.stringify({ open, at, id }));
  });
}

export async function readActionableSelection(): Promise<StoredSelection | undefined> {
  const [selection, state] = await Promise.all([
    LocalStorage.getItem(SELECTION_STORAGE_KEY),
    LocalStorage.getItem(LIST_STATE_STORAGE_KEY),
  ]);
  return actionableSelection(parseSelection(selection), parseListState(state), Date.now());
}

export const PINS_SEEDED_TOAST = {
  title: "Pinned all badge-tracked apps",
  message: "Unpin the ones you only want to see when badged",
};
export const PINS_RESEEDED_TOAST_TITLE = "Saved pins were unreadable, so all badge-tracked apps were pinned";

export interface LoadedConfig {
  config: ListConfig;
  utilityPins: UtilityId[];
  appsNotice?: AppsNotice;
  pinsNotice?: LoadedPins["notice"];
}

/** Everything the list needs, read together so it never shows one filter and then flips to another. */
export async function loadConfig(): Promise<LoadedConfig> {
  const apps = await loadAppsFrom(LocalStorage, getApplications);
  const [pins, filter, sortRaw, recentRaw, utilityRaw] = await Promise.all([
    loadPinsFrom(LocalStorage, apps.apps),
    loadViewFrom(LocalStorage),
    LocalStorage.getItem(SORT_STORAGE_KEY),
    LocalStorage.getItem(RECENT_STORAGE_KEY),
    LocalStorage.getItem(UTILITY_PINS_STORAGE_KEY),
  ]);
  return {
    config: {
      apps: apps.apps,
      pins: pins.pins,
      filter,
      sort: parseSort(sortRaw),
      recent: parseRecent(recentRaw),
    },
    utilityPins: parseUtilityPins(utilityRaw),
    appsNotice: apps.notice,
    pinsNotice: pins.notice,
  };
}

/** Selection and pins only (return from Configure): filter, sort, and recency are the list's own live state. */
export async function loadAppsAndPins(): Promise<{
  apps: SelectedApp[];
  pins: string[];
  utilityPins: UtilityId[];
  appsNotice?: AppsNotice;
}> {
  const apps = await loadAppsFrom(LocalStorage, getApplications);
  const [pins, utilityPins] = await Promise.all([loadPinsFrom(LocalStorage, apps.apps), loadUtilityPins()]);
  return { apps: apps.apps, pins: pins.pins, utilityPins, appsNotice: apps.notice };
}

/** Utility pins (SPEC.md §9): unreadable means nothing pinned, and reading never writes. */
export async function loadUtilityPins(): Promise<UtilityId[]> {
  return parseUtilityPins(await LocalStorage.getItem(UTILITY_PINS_STORAGE_KEY));
}

export async function saveUtilityPins(pins: UtilityId[]): Promise<void> {
  await write(() => LocalStorage.setItem(UTILITY_PINS_STORAGE_KEY, serializeUtilityPins(pins)));
}

export async function saveApps(apps: SelectedApp[]): Promise<void> {
  await write(() => LocalStorage.setItem(STORAGE_KEY, serializeSelection(apps)));
}

export async function savePins(pins: string[]): Promise<void> {
  await write(() => LocalStorage.setItem(PINS_STORAGE_KEY, serializePins(pins)));
}

export async function saveFilter(filter: ListView): Promise<void> {
  await write(() => LocalStorage.setItem(VIEW_STORAGE_KEY, filter));
}

export async function saveSort(sort: SortMode): Promise<void> {
  await write(() => LocalStorage.setItem(SORT_STORAGE_KEY, sort));
}

/**
 * Read-modify-write of the recency map, queued so a `frontAt` stamp after a scan and a `switchedAt` stamp from a switch
 * never overwrite each other. The pure `stampRecent` prunes to 50 and ignores apps without a bundle ID.
 */
export async function recordRecent(
  bundleId: string | undefined,
  field: "switchedAt" | "frontAt",
  at: number,
): Promise<RecentMap> {
  return write(async () => {
    const current = parseRecent(await LocalStorage.getItem(RECENT_STORAGE_KEY));
    const next = stampRecent(current, bundleId, field, at);
    if (next !== current) await LocalStorage.setItem(RECENT_STORAGE_KEY, serializeRecent(next));
    return next;
  });
}

export async function showConfigNotices(loaded: { appsNotice?: AppsNotice; pinsNotice?: LoadedPins["notice"] }) {
  switch (loaded.appsNotice) {
    case "seeded":
      await showToast({ style: Toast.Style.Success, ...SEEDED_TOAST });
      break;
    case "reseeded-corrupt":
      await showToast({ style: Toast.Style.Failure, title: RESEEDED_TOAST_TITLE });
      break;
    case "missing-after-setup":
      await showToast({ style: Toast.Style.Failure, title: MISSING_AFTER_SETUP_TOAST_TITLE });
      break;
  }
  if (loaded.pinsNotice === "seeded") {
    await showToast({ style: Toast.Style.Success, ...PINS_SEEDED_TOAST });
  } else if (loaded.pinsNotice === "reseeded-corrupt") {
    await showToast({ style: Toast.Style.Failure, title: PINS_RESEEDED_TOAST_TITLE });
  }
}
