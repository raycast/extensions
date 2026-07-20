import type { Note } from "../types";
import { stripHtml } from "./stripHtml";
import { toMarkdown } from "./toMarkdown";

/**
 * Drop unpaired UTF-16 surrogates. Raycast's render-tree serializer throws
 * ("Cannot parse render tree JSON … expected low-surrogate") when one reaches
 * the UI — which also happens when a fixed-length truncation splits an emoji.
 */
export function stripLoneSurrogates(text: string): string {
  return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

/** Truncate to `max` chars without leaving a split surrogate pair at the edge. */
export function truncate(text: string, max: number): string {
  return stripLoneSurrogates(text.slice(0, max));
}

/** Plain-text view: server-derived `contentText`, falling back to stripped HTML. */
export function notePlainText(note: Pick<Note, "content" | "contentText">): string {
  return stripLoneSurrogates(note.contentText ?? stripHtml(note.content ?? ""));
}

/**
 * Markdown view: the API derives `contentMarkdown` from the canonical JSON.
 * Falls back to turndown(HTML) for responses from an older server.
 */
export function noteMarkdown(note: Pick<Note, "content" | "contentMarkdown">): string {
  return stripLoneSurrogates(note.contentMarkdown || toMarkdown(note.content ?? ""));
}

/** Whether the note carries any renderable body. */
export function noteHasContent(note: Pick<Note, "content" | "contentMarkdown" | "contentText">): boolean {
  return Boolean(note.contentMarkdown || note.content || note.contentText);
}
