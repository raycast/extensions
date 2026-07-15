import { join } from "path";
import type { Book, FormatEntry } from "./types";

const FORMAT_PRIORITY = ["EPUB", "MOBI", "PDF"];
const CALIBRE_UNKNOWN_YEAR = 101;

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractYear(pubdate: string | null): number | null {
  if (!pubdate) return null;
  const match = pubdate.match(/^(\d{4})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  if (year <= CALIBRE_UNKNOWN_YEAR) return null;
  return year;
}

export function parseFormatData(formatData: string | null): FormatEntry[] {
  if (!formatData) return [];
  return formatData.split(";").map((entry) => {
    const pipeIndex = entry.indexOf("|");
    return {
      format: entry.substring(0, pipeIndex),
      name: entry.substring(pipeIndex + 1),
    };
  });
}

export function preferredFormat(entries: FormatEntry[]): FormatEntry | null {
  if (entries.length === 0) return null;
  for (const fmt of FORMAT_PRIORITY) {
    const found = entries.find((e) => e.format === fmt);
    if (found) return found;
  }
  return entries[0];
}

export function filterBooks(books: Book[], query: string): Book[] {
  const q = query.trim().toLowerCase();
  if (!q) return books;
  return books.filter(
    (b) =>
      b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
  );
}

export function buildCoverPath(libraryPath: string, bookPath: string): string {
  return join(libraryPath, bookPath, "cover.jpg");
}

export function buildBookFolderPath(
  libraryPath: string,
  bookPath: string,
): string {
  return join(libraryPath, bookPath);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
