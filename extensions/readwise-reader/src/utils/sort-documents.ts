import { type Document } from "./document";

export type SortBy =
  | "last_moved_at"
  | "saved_at"
  | "published_date"
  | "last_opened_at"
  | "author"
  | "category"
  | "word_count"
  | "reading_progress"
  | "title"
  | "random";

export type SortDirection = "ascending" | "descending";

type FieldSortBy = Exclude<SortBy, "random">;

const DATE_FIELDS: readonly FieldSortBy[] = ["last_moved_at", "saved_at", "published_date", "last_opened_at"];
const TEXT_FIELDS: readonly FieldSortBy[] = ["author", "category", "title"];

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function randomRank(documentId: string, seed: number): number {
  return fnv1a(`${seed}:${documentId}`);
}

export function defaultDirectionFor(sortBy: SortBy): SortDirection {
  return TEXT_FIELDS.includes(sortBy as FieldSortBy) ? "ascending" : "descending";
}

function isMissing(doc: Document, sortBy: FieldSortBy): boolean {
  const value = doc[sortBy];
  if (value === null || value === undefined || value === "") {
    return true;
  }
  if (DATE_FIELDS.includes(sortBy)) {
    return Number.isNaN(Date.parse(value as string));
  }
  return false;
}

function compareValue(a: Document, b: Document, sortBy: FieldSortBy): number {
  if (TEXT_FIELDS.includes(sortBy)) {
    return String(a[sortBy]).localeCompare(String(b[sortBy]), undefined, {
      sensitivity: "base",
      numeric: true,
    });
  }
  if (DATE_FIELDS.includes(sortBy)) {
    return Date.parse(a[sortBy] as string) - Date.parse(b[sortBy] as string);
  }
  // numeric fields: word_count, reading_progress
  return (a[sortBy] as number) - (b[sortBy] as number);
}

export function dedupeById(docs: readonly Document[]): Document[] {
  const seen = new Set<string>();
  const result: Document[] = [];
  for (const doc of docs) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      result.push(doc);
    }
  }
  return result;
}

export function sortDocuments(
  docs: readonly Document[],
  sortBy: SortBy,
  direction: SortDirection,
  seed: number,
): Document[] {
  const result = [...docs];

  // direction is not meaningful for random order; ignore it
  if (sortBy === "random") {
    return result.sort((a, b) => randomRank(a.id, seed) - randomRank(b.id, seed));
  }

  return result.sort((a, b) => {
    const aMissing = isMissing(a, sortBy);
    const bMissing = isMissing(b, sortBy);

    // Missing values always sort last, independent of direction.
    if (aMissing && bMissing) {
      return a.id.localeCompare(b.id);
    }
    if (aMissing) {
      return 1;
    }
    if (bMissing) {
      return -1;
    }

    const base = compareValue(a, b, sortBy);
    const directed = direction === "ascending" ? base : -base;
    return directed || a.id.localeCompare(b.id);
  });
}
