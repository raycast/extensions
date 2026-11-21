// The pure parts of Search Notes and Open Note: how Kanso's note rows become
// list items, what the preview pane shows, and what the actions copy. No
// Raycast imports, so the vitest suite runs it as is.

import { isRecord } from "./client";
import { Notebook, noteLink } from "./capture-logic";

export const SEARCH_DEBOUNCE_MS = 200;
export const LOCKED_PREVIEW = "This note is locked. Open it in Kanso to read it.";
export const EMPTY_PREVIEW = "No text to show. If this note is locked, open it in Kanso.";

export type NoteRow = {
  id: string;
  title: string;
  bookId?: string;
  updatedAt?: number;
  /** The first 200 characters Kanso sends with a search or list result. */
  snippet: string;
  locked: boolean;
};

export type FullNote = { body: string; locked: boolean };

/** Does this note doc say it is locked? A locked note's body is never shown. */
export function isLocked(doc: Record<string, unknown>): boolean {
  return doc.kansoLock !== undefined || doc.locked === true;
}

/** Notes out of `search-notes` or `list-notes`. Rows that are not notes are dropped. */
export function noteRows(docs: unknown): NoteRow[] {
  const list = Array.isArray(docs) ? docs : [];
  const rows: NoteRow[] = [];
  for (const doc of list) {
    if (!isRecord(doc) || typeof doc._id !== "string" || !doc._id.startsWith("note:")) continue;
    const locked = isLocked(doc);
    rows.push({
      id: doc._id,
      title: typeof doc.title === "string" && doc.title.trim() ? doc.title.trim() : "Untitled",
      bookId: typeof doc.bookId === "string" ? doc.bookId : undefined,
      updatedAt: typeof doc.updatedAt === "number" ? doc.updatedAt : undefined,
      snippet: locked ? "" : typeof doc.body === "string" ? doc.body : "",
      locked,
    });
  }
  return rows;
}

export type SearchRequest = { tool: "search-notes"; args: { keyword: string } } | { tool: "list-notes"; args: object };

/** Search for a typed query; recent notes when it is empty. */
export function searchRequest(query: string): SearchRequest {
  const keyword = query.trim();
  if (keyword === "") return { tool: "list-notes", args: { sort: "updatedAt", limit: 30 } };
  return { tool: "search-notes", args: { keyword } };
}

export function bookName(books: Notebook[], id: string | undefined): string | undefined {
  if (!id) return undefined;
  return books.find((b) => b.id === id)?.name;
}

/** "12 Nov" this year, "12 Nov 2025" before. */
export function updatedLabel(ms: number | undefined, now = new Date()): string | undefined {
  if (ms === undefined) return undefined;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return undefined;
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}

/** The notebook's name, when known. */
export function subtitleFor(row: NoteRow, books: Notebook[]): string {
  return bookName(books, row.bookId) ?? "";
}

/** What `read-note` returned: the note doc, or nothing usable. */
export function readBody(result: unknown): FullNote | undefined {
  if (!isRecord(result)) return undefined;
  const locked = isLocked(result);
  return { body: locked ? "" : typeof result.body === "string" ? result.body : "", locked };
}

/** The preview pane's markdown. A locked note never shows its body. */
export function previewMarkdown(row: NoteRow, full: FullNote | undefined): string {
  if (row.locked || full?.locked) return `# ${row.title}\n\n${LOCKED_PREVIEW}`;
  const body = (full ? full.body : row.snippet).trim();
  if (!full && body === "") return `# ${row.title}`;
  return `# ${row.title}\n\n${body === "" ? EMPTY_PREVIEW : body}`;
}

/** Does the note have a task line? Only then "Add Task Here" is offered. */
export function hasTasks(row: NoteRow, full: FullNote | undefined): boolean {
  if (row.locked || full?.locked) return false;
  return /^\s*[-*+] \[[ xX]\]/m.test(full ? full.body : row.snippet);
}

/** What the actions do: open and copy the same `kanso://` link, copy the title. */
export function noteActions(row: NoteRow): { open: string; link: string; title: string } {
  const link = noteLink(row.id);
  return { open: link, link, title: row.title };
}
