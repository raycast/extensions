import { Cache } from "@raycast/api";
import type { MenuBarPr } from "./utils";
import { storeLog as log, getErrorMessage } from "./logger";

/**
 * Synchronous, cross-command cache for the menu-bar badge payload.
 *
 * Why `Cache` and not `LocalStorage`: a background-launched menu-bar command must settle
 * `isLoading` to `false` for Raycast to commit its render, and it only gets a short execution
 * window. `LocalStorage` is async, so reading it defers first render past that window and the
 * badge keeps its stale value. `Cache` reads synchronously, so the command can render correct
 * data on its FIRST render. `Cache` is also shared between an extension's commands by default.
 *
 * See docs/PERFORMANCE-FINDINGS.md §1 and §5.3.
 */
const cache = new Cache({ namespace: "menu-bar" });

const ITEMS_KEY = "unread-items";
const STAMP_KEY = "unread-updated-at";

/**
 * How long a stored payload is considered fresh enough to skip a network fetch.
 *
 * Deliberately just under the menu-bar command's 5-minute `interval` (see package.json). A
 * shorter window (the original 60s) is useless: a scheduled launch arriving 5 minutes after the
 * last write always sees a stale entry, so the menu bar re-scans every single interval and the
 * cache saves nothing. At 4.5 minutes a launch triggered by recent view activity reuses that
 * work, while the regular interval still refreshes on schedule.
 */
export const FRESHNESS_MS = 270_000;

export interface CachedMenuBar {
  items: MenuBarPr[];
  updatedAt: number;
}

/**
 * Read the stored payload synchronously. Safe to call from a `useState` initializer — that is
 * the entire point of this module.
 */
export function readMenuBarCache(): CachedMenuBar | undefined {
  const raw = cache.get(ITEMS_KEY);
  if (!raw) return undefined;
  try {
    const items = JSON.parse(raw) as unknown;
    if (!Array.isArray(items)) {
      log.warn("Menu bar cache is not an array — ignoring");
      return undefined;
    }
    // Guard every field the menu renders; a malformed entry would otherwise render "#undefined".
    const valid = items.filter(
      (i): i is MenuBarPr =>
        i != null &&
        typeof i === "object" &&
        typeof (i as MenuBarPr).key === "string" &&
        typeof (i as MenuBarPr).number === "number" &&
        typeof (i as MenuBarPr).title === "string" &&
        typeof (i as MenuBarPr).repo === "string" &&
        typeof (i as MenuBarPr).unseenCount === "number",
    );
    const updatedAt = Number(cache.get(STAMP_KEY) ?? 0);
    return { items: valid, updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0 };
  } catch (error) {
    log.warn("Menu bar cache is corrupt — ignoring", { error: getErrorMessage(error) });
    return undefined;
  }
}

/** Write the payload. Called by whichever command most recently computed a fresh list. */
export function writeMenuBarCache(items: MenuBarPr[]): void {
  try {
    cache.set(ITEMS_KEY, JSON.stringify(items));
    cache.set(STAMP_KEY, String(Date.now()));
  } catch (error) {
    // A cache write failure degrades the badge to a network fetch — never fatal.
    log.warn("Failed to write menu bar cache", { error: getErrorMessage(error) });
  }
}

/** True when a stored payload is recent enough that a network fetch would be redundant. */
export function isFresh(entry: CachedMenuBar | undefined, now = Date.now()): entry is CachedMenuBar {
  return entry !== undefined && now - entry.updatedAt < FRESHNESS_MS;
}
