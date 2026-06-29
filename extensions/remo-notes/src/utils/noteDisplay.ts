import type { Note } from "../types";
import { stripHtml } from "./stripHtml";
import { toMarkdown } from "./toMarkdown";

/** Plain-text view: server-derived `contentText`, falling back to stripped HTML. */
export function notePlainText(note: Pick<Note, "content" | "contentText">): string {
  return note.contentText ?? stripHtml(note.content ?? "");
}

/**
 * Markdown view: the API derives `contentMarkdown` from the canonical JSON.
 * Falls back to turndown(HTML) for responses from an older server.
 */
export function noteMarkdown(note: Pick<Note, "content" | "contentMarkdown">): string {
  return note.contentMarkdown || toMarkdown(note.content ?? "");
}

/** Whether the note carries any renderable body. */
export function noteHasContent(note: Pick<Note, "content" | "contentMarkdown" | "contentText">): boolean {
  return Boolean(note.contentMarkdown || note.content || note.contentText);
}
