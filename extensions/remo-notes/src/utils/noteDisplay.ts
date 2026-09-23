import type { Note } from "../types";
import { stripHtml } from "./stripHtml";
import { toMarkdown } from "./toMarkdown";

/** Lone surrogates crash Raycast's render-tree serializer ("expected low-surrogate") when they reach the UI. */
export function stripLoneSurrogates(text: string): string {
  return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

/** Truncate to `max` chars without leaving a split surrogate pair at the edge. */
export function truncate(text: string, max: number): string {
  return stripLoneSurrogates(text.slice(0, max));
}

export function notePlainText(note: Pick<Note, "content" | "contentText">): string {
  return stripLoneSurrogates(note.contentText ?? stripHtml(note.content ?? ""));
}

/** Falls back to turndown(HTML) for older API responses without contentMarkdown. */
export function noteMarkdown(note: Pick<Note, "content" | "contentMarkdown">): string {
  return stripLoneSurrogates(note.contentMarkdown || toMarkdown(note.content ?? ""));
}

export function noteHasContent(note: Pick<Note, "content" | "contentMarkdown" | "contentText">): boolean {
  return Boolean(note.contentMarkdown || note.content || note.contentText);
}
