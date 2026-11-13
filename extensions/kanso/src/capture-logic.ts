// The pure parts of Quick Capture and Add Task: what is sent to Kanso, what
// the preview says, and the copy for each failure. No Raycast imports, so the
// vitest suite runs it as is.

import { KansoError, isRecord } from "./client";

export const INBOX_ID = "book:inbox";
export const INBOX_NAME = "Inbox";
export const PREVIEW_DEBOUNCE_MS = 150;
const TITLE_MAX = 128;

export type Notebook = { id: string; name: string };

/** The link that brings a note forward in Kanso (the phone's format). */
export function noteLink(noteId: string): string {
  return `kanso://open/note/${encodeURIComponent(noteId)}`;
}

/** The first line becomes the title and the rest the body. */
export function splitCapture(text: string): { title: string; body: string } {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  const newline = trimmed.indexOf("\n");
  const first = (newline === -1 ? trimmed : trimmed.slice(0, newline)).trim();
  const rest = newline === -1 ? "" : trimmed.slice(newline + 1).trim();
  if (first.length <= TITLE_MAX) return { title: first, body: rest };
  // A title Kanso would refuse: cut it, and keep the whole first line in the body.
  const cut = first.slice(0, TITLE_MAX).trimEnd();
  return { title: cut, body: rest ? `${first}\n\n${rest}` : first };
}

/** The `create-note` arguments. Only fields a Capture key may set. */
export function noteArgs(text: string, bookId: string): { bookId: string; title: string; body: string } {
  return { bookId: bookId || INBOX_ID, ...splitCapture(text) };
}

/** The notebook dropdown: the Inbox first, then the rest by name. */
export function notebookChoices(docs: unknown): Notebook[] {
  const list = Array.isArray(docs) ? docs : [];
  const books: Notebook[] = [];
  for (const doc of list) {
    if (!isRecord(doc) || typeof doc._id !== "string" || !doc._id.startsWith("book:")) continue;
    if (doc._id === INBOX_ID) continue;
    const name = typeof doc.name === "string" && doc.name.trim() ? doc.name.trim() : doc._id;
    books.push({ id: doc._id, name });
  }
  books.sort((a, b) => a.name.localeCompare(b.name));
  return [{ id: INBOX_ID, name: INBOX_NAME }, ...books];
}

export function notebookName(choices: Notebook[], id: string): string {
  return choices.find((b) => b.id === id)?.name ?? (id === INBOX_ID ? INBOX_NAME : "that notebook");
}

/** Where "Put it in" sends the task: a target, or one note. Daily is the default. */
export function taskArgs(
  text: string,
  destination: string,
): { text: string; target?: "daily" | "inbox"; noteId?: string } {
  const clean = text.trim();
  if (destination === "inbox") return { text: clean, target: "inbox" };
  if (destination.startsWith("note:")) return { text: clean, noteId: destination };
  return { text: clean, target: "daily" };
}

/** A recent note for the "Put it in" dropdown. */
export type NoteChoice = { id: string; title: string };

export function noteChoices(docs: unknown): NoteChoice[] {
  const list = Array.isArray(docs) ? docs : [];
  const notes: NoteChoice[] = [];
  for (const doc of list) {
    if (!isRecord(doc) || typeof doc._id !== "string" || !doc._id.startsWith("note:")) continue;
    // Daily notes have their own entry.
    if (doc._id.startsWith("note:daily-")) continue;
    const title = typeof doc.title === "string" && doc.title.trim() ? doc.title.trim() : "Untitled";
    notes.push({ id: doc._id, title });
  }
  return notes;
}

/** What `kanso-parse-when` says, in the shape the form shows. */
export type When = { text: string; due: string | null; repeat: string | null; label: string | null };

export function readWhen(result: unknown): When | undefined {
  if (!isRecord(result) || typeof result.text !== "string") return undefined;
  const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
  return { text: result.text, due: str(result.due), repeat: str(result.repeat), label: str(result.label) };
}

/**
 * The line under the field. It is Kanso's own label, so the preview and the
 * saved task agree. With no date and no repeat the task is saved as written.
 */
export function previewLine(text: string, when: When | undefined, pending: boolean): string {
  if (text.trim() === "") return "Type a task. Add a day, a time or “every week” at the end.";
  if (pending && !when) return "Reading the date…";
  if (!when || !when.label) return "No date or repeat. It will be saved as written.";
  return when.label;
}

/** "Fri 14 Nov, 15:00 · every week" reads "Fri 14 Nov 15:00 · every week" in the toast. */
export function taskToast(added: unknown): { title: string; noteId?: string } {
  const label = isRecord(added) && typeof added.label === "string" && added.label ? added.label : undefined;
  const noteId = isRecord(added) && typeof added.noteId === "string" ? added.noteId : undefined;
  const when = label?.replace(/^([^,]+),\s/, "$1 ");
  return { title: when ? `Task added · ${when}` : "Task added", noteId };
}

/** The id of the note `create-note` made. */
export function createdId(result: unknown): string | undefined {
  if (!isRecord(result)) return undefined;
  if (typeof result._id === "string") return result._id;
  if (typeof result.id === "string") return result.id;
  return undefined;
}

/** What a failure says. Kanso's own refusal of a Capture key is shown as it is. */
export function errorCopy(e: unknown): { title: string; message?: string } {
  if (e instanceof KansoError) {
    if (e.kind === "failed" && e.detail && /^This key can/.test(e.detail)) {
      // A 403: Kanso's copy already says what the key can do and where to make another.
      return { title: "This key can't do that", message: e.detail };
    }
    return { title: e.message };
  }
  return { title: "Couldn't reach Kanso", message: e instanceof Error ? e.message : String(e) };
}
