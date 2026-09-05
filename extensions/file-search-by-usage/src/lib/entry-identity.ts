import { Entry } from "./types";

/** The stable key used for usage history, pins, and learned queries. */
export function entryStoragePath(entry: Entry): string {
  return entry.storagePath ?? entry.path;
}

/** Keep Raycast's selection attached to a path while results reorder. */
export function rowIdForEntry(generation: number, entry: Entry): string {
  return `${generation}:${entry.path}`;
}
