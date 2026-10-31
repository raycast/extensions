// The Utilities section below the app rows (SPEC.md §9): one Trash row, pinnable on its own, never part of the app
// order. Pure: no Raycast or Node imports, so the visibility rule and the stored pins are unit-tested.
import type { ListView } from "./badge/views.ts";
import { tokens } from "./window/model.ts";

/** Kept apart from `pins.v1`, which holds tracked bundle IDs only and is pruned to them on every load. */
export const UTILITY_PINS_STORAGE_KEY = "utilityPins.v1";

export type UtilityId = "trash";
const UTILITY_IDS: readonly UtilityId[] = ["trash"];

/** Not `app:` or `win:`, so no app-row rule (selection fallback, stored selection) ever mistakes it for an app. */
export const TRASH_ITEM_ID = "util:trash";

/** What a search is matched against: the row's title plus the words its actions and Finder's own names use. */
const TRASH_SEARCH_TEXT = "Trash Open Trash Empty Trash Bin Recycle Bin";

/**
 * Raycast's built-in Empty Trash, launched by name (read from Raycast 2.6.0: built-ins resolve by the slug of the
 * extension title "System Actions" and the command title). Raycast does the erasing, so this extension never deletes a
 * file and needs no Finder Automation permission.
 */
export const EMPTY_TRASH_COMMAND = {
  ownerOrAuthorName: "raycast",
  extensionName: "system-actions",
  name: "empty-trash",
} as const;

/**
 * Pinned: shown at the end of All Apps and Pinned + Badged, like a pinned app. Searching shows it in those two filters
 * whenever the query matches, pinned or not, so it is reachable without pinning. Badged Only never shows it: the Trash
 * has no Dock badge to report.
 */
export function trashVisible(pinned: boolean, filter: ListView, query: string): boolean {
  if (filter === "badgedOnly") return false;
  const ts = tokens(query);
  if (ts.length === 0) return pinned;
  const text = TRASH_SEARCH_TEXT.toLocaleLowerCase();
  return ts.every((t) => text.includes(t));
}

/** Missing or unreadable means nothing pinned; reading never writes. Unknown ids are dropped, duplicates collapsed. */
export function parseUtilityPins(raw: unknown): UtilityId[] {
  if (typeof raw !== "string") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const pins: UtilityId[] = [];
  for (const entry of parsed) {
    if (UTILITY_IDS.includes(entry as UtilityId) && !pins.includes(entry as UtilityId)) pins.push(entry as UtilityId);
  }
  return pins;
}

export function serializeUtilityPins(pins: UtilityId[]): string {
  return JSON.stringify(pins);
}

export function toggleUtilityPin(pins: UtilityId[], id: UtilityId): UtilityId[] {
  return pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id];
}
