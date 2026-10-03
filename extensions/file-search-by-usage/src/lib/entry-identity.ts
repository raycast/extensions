import { Entry } from "./types";
import { canonicalPathAsync } from "./read-dir";

/** The stable key used for usage history, pins, and learned queries. */
export function entryStoragePath(entry: Entry): string {
  return entry.storagePath ?? entry.path;
}

/**
 * Resolve the storage identity immediately before an interactive action.
 *
 * `storagePath` is a snapshot from indexing or listing. A symlink can be
 * retargeted while that row remains visible, so actions must not persist usage,
 * pins, or learned searches against the cached target.
 */
export async function currentEntryStoragePath(entry: Entry): Promise<string> {
  return canonicalPathAsync(entry.path);
}

/** Keep Raycast's selection attached to a path while results reorder. */
export function rowIdForEntry(generation: number, entry: Entry): string {
  return `${generation}:${entry.path}`;
}
