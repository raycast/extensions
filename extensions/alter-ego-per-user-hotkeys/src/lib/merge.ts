import { AlterEgoMap, Target } from "./types";

/** Adds or replaces one row; every other username's entry is preserved. */
export function upsertRow(map: AlterEgoMap, username: string, target: Target): AlterEgoMap {
  return { ...map, [username]: target };
}

/** Removes one row; every other username's entry is preserved. */
export function removeRow(map: AlterEgoMap, username: string): AlterEgoMap {
  const next = { ...map };
  delete next[username];
  return next;
}

/**
 * Saves a row from the edit form. When an existing row's username was changed,
 * the original key is dropped so the old target doesn't linger under it.
 */
export function saveRow(
  map: AlterEgoMap,
  originalUsername: string | undefined,
  username: string,
  target: Target,
): AlterEgoMap {
  const base = originalUsername !== undefined && originalUsername !== username ? removeRow(map, originalUsername) : map;
  return upsertRow(base, username, target);
}
