import { BIBLE_BOOKS_DE } from "./bible-books";
import { BIBLE_VERSE_COUNTS } from "./bible-verses";

export function normalizeText(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function findBibleBooks(name: string) {
  const normalized = name.replace(/\.$/, "");
  return BIBLE_BOOKS_DE.filter((book) => book.aliases.some((alias) => normalizeText(alias) === normalized));
}

export function findBibleReferenceBooks(query: string) {
  const match = normalizeText(query.replace(/\s+/g, "")).match(/^(.*?)(\d+):/);
  return match ? findBibleBooks(match[1]) : [];
}

export function isBibleReference(query: string): boolean {
  return findBibleReferenceBooks(query).length > 0;
}

export function parseBibleReference(input: string) {
  const normalized = normalizeText(input.replace(/\s+/g, ""));
  const match = normalized.match(/^(.*?)(\d+):(\d+)(?:([-,])(\d+))?$/);
  if (!match) {
    return null;
  }

  const books = findBibleBooks(match[1]);
  const book = books.length === 1 ? books[0] : undefined;
  const chapter = Number(match[2]);
  const verseStart = Number(match[3]);
  const verseEnd = match[5] ? Number(match[5]) : null;
  // Finder references encode chapter and verse numbers in three digits each.
  const validNumber = (value: number) => Number.isInteger(value) && value > 0 && value <= 999;
  if (!book || !validNumber(chapter) || !validNumber(verseStart)) {
    return null;
  }
  if (verseEnd !== null && (!validNumber(verseEnd) || verseEnd < verseStart)) {
    return null;
  }
  const lastVerse = BIBLE_VERSE_COUNTS[book.id - 1]?.[chapter - 1];
  if (!lastVerse || verseStart > lastVerse || (verseEnd !== null && verseEnd > lastVerse)) {
    return null;
  }
  if (match[4] === "," && verseEnd !== verseStart + 1) {
    return null;
  }

  return { book, chapter, verseStart, verseEnd };
}

export function findPublicationMatch<T extends { folderName: string; symbol?: string }>(
  query: string,
  publications: T[],
): { publication: T; filter: string } | null {
  const result = findPublicationCandidates(query, publications);
  return result.publications.length === 1 ? { publication: result.publications[0], filter: result.filter } : null;
}

export function findPublicationCandidates<T extends { folderName: string; symbol?: string }>(
  query: string,
  publications: T[],
): { publications: T[]; filter: string } {
  const match = query.trim().match(/^(\S+)(?:\s+(.*))?$/);
  if (!match) return { publications: [], filter: "" };
  const normalized = normalizeText(match[1]);
  const filter = (match[2] ?? "").trim();
  const exact = publications.find((entry) => normalizeText(entry.folderName) === normalized);
  if (exact) return { publications: [exact], filter };
  return {
    publications: filter
      ? publications.filter((entry) => entry.symbol && normalizeText(entry.symbol) === normalized)
      : [],
    filter,
  };
}
