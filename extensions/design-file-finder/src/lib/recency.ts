import { FileRecord, SortKey } from "./types";

/**
 * Recency used for the "recent" sort and the relative-time accessory:
 * the more recent of the Spotlight last-opened date and the file's modified time.
 */
export function recencyMs(r: FileRecord): number {
  return Math.max(r.modifiedMs, r.lastUsedMs ?? 0);
}

export function comparator(sort: SortKey): (a: FileRecord, b: FileRecord) => number {
  switch (sort) {
    case "name":
      return (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) || recencyMs(b) - recencyMs(a);
    case "folder":
      return (a, b) =>
        a.folder.localeCompare(b.folder, undefined, { sensitivity: "base" }) ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    case "type":
      return (a, b) => a.ext.localeCompare(b.ext) || recencyMs(b) - recencyMs(a);
    case "recent":
    default:
      return (a, b) => recencyMs(b) - recencyMs(a) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  }
}

export function sortRecords(records: FileRecord[], sort: SortKey): FileRecord[] {
  return [...records].sort(comparator(sort));
}
