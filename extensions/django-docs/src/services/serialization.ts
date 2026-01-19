import { DocEntry } from "../types/DocEntry";

/**
 * Serializable format for DocEntry - stores URLs instead of circular object references.
 * Used for caching and any context where circular refs can't be serialized.
 */
export interface SerializableEntry {
  url: string;
  title: string;
  content: string;
  parentUrl: string | null;
  previousUrl: string | null;
  nextUrl: string | null;
}

/**
 * Convert DocEntry[] to serializable format (no circular refs).
 */
export function serializeEntries(entries: DocEntry[]): SerializableEntry[] {
  return entries.map((e) => ({
    url: e.url,
    title: e.title,
    content: e.content,
    parentUrl: e.parent?.url ?? null,
    previousUrl: e.previous?.url ?? null,
    nextUrl: e.next?.url ?? null,
  }));
}

/**
 * Reconstruct DocEntry[] with circular references from serializable format.
 */
export function deserializeEntries(serialized: SerializableEntry[]): DocEntry[] {
  const entries: DocEntry[] = serialized.map((s) => ({
    url: s.url,
    title: s.title,
    content: s.content,
    parent: null,
    previous: null,
    next: null,
  }));

  const entryByUrl = new Map(entries.map((e) => [e.url, e]));

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const s = serialized[i];
    entry.parent = s.parentUrl ? (entryByUrl.get(s.parentUrl) ?? null) : null;
    entry.previous = s.previousUrl ? (entryByUrl.get(s.previousUrl) ?? null) : null;
    entry.next = s.nextUrl ? (entryByUrl.get(s.nextUrl) ?? null) : null;
  }

  return entries;
}
