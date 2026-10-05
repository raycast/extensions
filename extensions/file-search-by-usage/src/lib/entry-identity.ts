import { Entry } from "./types";
import { canonicalPathAsync } from "./read-dir";

const storageSource = Symbol("storageSource");
type ResolvedEntry = Entry & { [storageSource]?: Entry };
export type EntryStorageUpdate = { source: Entry; storagePath: string };

/** Identify the row snapshot refreshed by an action, including repeated actions. */
export function entryStorageSource(entry: Entry): Entry {
  return (entry as ResolvedEntry)[storageSource] ?? entry;
}

/** Merge usage only for the same target, retaining the source of the row. */
export function mergeEntryUsage(entry: Entry, other: Entry): Entry {
  if (entryStoragePath(entry) !== entryStoragePath(other)) return entry;
  return {
    ...entry,
    [storageSource]: entryStorageSource(entry),
    useCount: entry.useCount ?? other.useCount,
    lastUsedMs: entry.lastUsedMs ?? other.lastUsedMs,
  } as ResolvedEntry;
}

/** Fresh directory/index snapshots supersede overrides for an older snapshot. */
export function applyEntryStorageUpdate(
  entry: Entry,
  update?: EntryStorageUpdate,
): Entry {
  if (
    update?.source !== entryStorageSource(entry) ||
    update.storagePath === entryStoragePath(entry)
  )
    return entry;
  return {
    ...entry,
    [storageSource]: update.source,
    storagePath: update.storagePath,
    dev: undefined,
    ino: undefined,
    useCount: undefined,
    lastUsedMs: undefined,
  } as ResolvedEntry;
}

/** The stable key used for usage history, pins, and learned queries. */
export function entryStoragePath(entry: Entry): string {
  return entry.storagePath ?? entry.path;
}

/**
 * Resolve the storage identity immediately before an interactive action.
 *
 * `storagePath` is a snapshot from indexing or listing. A symlink can be
 * retargeted while that row remains visible, so successful live resolution wins.
 * On timeout or failure, keep the saved key that the row uses for ranking and
 * pins; use the visible path only when there is no saved identity.
 */
export async function currentEntryStoragePath(
  entry: Entry,
  budgetMs = 250,
): Promise<string> {
  return canonicalPathAsync(
    entry.path,
    budgetMs,
    entry.storagePath ?? entry.path,
  );
}

/** Keep Raycast's selection attached to a path while results reorder. */
export function rowIdForEntry(generation: number, entry: Entry): string {
  return `${generation}:${entry.path}`;
}
