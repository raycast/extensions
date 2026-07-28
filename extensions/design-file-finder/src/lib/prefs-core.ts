import { Drive, SortKey } from "./types";

export const VALID_SORTS: SortKey[] = ["recent", "name", "folder", "type"];

export function isSortKey(v: unknown): v is SortKey {
  return typeof v === "string" && VALID_SORTS.includes(v as SortKey);
}

/** Parse a stored JSON string array of drive paths. Tolerant of garbage. */
export function parseEnabled(raw: string | undefined | null): string[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
  } catch {
    // ignore
  }
  return null;
}

/**
 * Resolve which drive paths are enabled. Falls back to "all indexed drives" the
 * first time (so the first run is instant), or all drives if none are indexed.
 */
export function resolveEnabled(stored: string[] | null, drives: Drive[]): Set<string> {
  const valid = new Set(drives.map((d) => d.path));
  if (stored) {
    const filtered = stored.filter((p) => valid.has(p));
    if (filtered.length > 0) return new Set(filtered);
  }
  const indexed = drives.filter((d) => d.indexed).map((d) => d.path);
  return new Set(indexed.length > 0 ? indexed : drives.map((d) => d.path));
}
