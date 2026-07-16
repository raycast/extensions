import { LocalStorage } from "@raycast/api";
import { createLogger } from "../utils/logger";

/**
 * Persists the user's in-app–selected search folders in Raycast's `LocalStorage`
 * (as opposed to extension preferences). This is what lets the folder-picker UI
 * add and remove roots without leaving the extension. Thin Raycast glue —
 * verified manually; the list logic it wraps is tested in `roots.ts`.
 */

const log = createLogger("roots-store");

/** LocalStorage key under which the JSON array of root paths is stored. */
export const STORED_ROOTS_KEY = "reposcout.searchRoots";

/** Load the stored search roots, tolerating a missing or corrupt value. */
export async function loadStoredRoots(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(STORED_ROOTS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch (error) {
    log.warn("discarding corrupt stored roots", error);
    return [];
  }
}

/** Persist the given search roots. */
export async function saveStoredRoots(roots: readonly string[]): Promise<void> {
  await LocalStorage.setItem(STORED_ROOTS_KEY, JSON.stringify(roots));
}
