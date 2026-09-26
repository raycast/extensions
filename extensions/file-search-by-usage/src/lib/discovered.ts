import { Cache } from "@raycast/api";

/**
 * Caches that are no longer written, retained only so they can be deleted.
 *
 * Nothing fills these now: `discovered` held paths earlier Spotlight passes had
 * surfaced, `shared-folders` held the Google Drive shared-folder index, and
 * `recent-files` held the imported recent-document seed. The fd index covers
 * that ground. Existing installs still have the files, though, and "Delete All
 * Data and Cache" should remove them rather than leave megabytes behind.
 *
 * Delete this module once enough time has passed that no install still carries
 * these namespaces.
 */
const LEGACY = [
  { namespace: "discovered", capacity: 4_000_000, key: "paths" },
  { namespace: "shared-folders", capacity: 8_000_000, key: "index" },
  { namespace: "recent-files", capacity: 16_000_000, key: "entries" },
] as const;

/** Bytes removed, for the deletion summary. */
export function clearLegacyCaches(): number {
  let bytes = 0;
  for (const entry of LEGACY) {
    const cache = new Cache({
      namespace: entry.namespace,
      capacity: entry.capacity,
    });
    bytes += cache.get(entry.key)?.length ?? 0;
    cache.clear({ notifySubscribers: false });
  }
  return bytes;
}
