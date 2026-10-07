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
