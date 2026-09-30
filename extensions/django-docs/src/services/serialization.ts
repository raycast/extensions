import { DocEntry } from "../types/DocEntry";

/**
 * Serializable format for DocEntry - stores URLs instead of circular object references.
 * Used for caching and any context where circular refs can't be serialized.
 */
export interface SerializableEntry {
  url: string;
  title: string;
  content: string;
  headings?: string[];
  parentUrl: string | null;
  previousUrl: string | null;
  nextUrl: string | null;
}

/**
 * Convert DocEntry[] to serializable format (no circular refs).
 */
export function serializeEntries(entries: DocEntry[]): SerializableEntry[] {
  return entries.map((entry) => ({
    url: entry.url,
    title: entry.title,
    content: entry.content,
    headings: entry.headings ?? [],
    parentUrl: entry.parent?.url ?? null,
    previousUrl: entry.previous?.url ?? null,
    nextUrl: entry.next?.url ?? null,
  }));
}

/**
 * Reconstruct DocEntry[] with circular references from serializable format.
 */
export function deserializeEntries(serializedEntries: SerializableEntry[]): DocEntry[] {
  const entries: DocEntry[] = serializedEntries.map((serializedEntry) => ({
    url: serializedEntry.url,
    title: serializedEntry.title,
    content: serializedEntry.content,
    headings: serializedEntry.headings ?? [],
    parent: null,
    previous: null,
    next: null,
  }));

  const entryByUrl = new Map(entries.map((entry) => [entry.url, entry]));

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const serializedEntry = serializedEntries[i];
    entry.parent = serializedEntry.parentUrl ? (entryByUrl.get(serializedEntry.parentUrl) ?? null) : null;
    entry.previous = serializedEntry.previousUrl ? (entryByUrl.get(serializedEntry.previousUrl) ?? null) : null;
    entry.next = serializedEntry.nextUrl ? (entryByUrl.get(serializedEntry.nextUrl) ?? null) : null;
  }

  return entries;
}
