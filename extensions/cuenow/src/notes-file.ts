import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

/**
 * Where CueNow keeps its notes.
 *
 * Reading the file is how this extension lists notes, and it is deliberately the only
 * thing it does with it. CueNow holds notes in memory and autosaves on a timer, so
 * anything written here would be overwritten by the running app on its next save —
 * every change goes through the `cuenow://` scheme instead.
 *
 * A consequence worth knowing: the list shows the last autosaved state, so a note typed
 * a second ago may not appear yet.
 */
const NOTES_FILE = join(homedir(), "Library", "Application Support", "CueNow", "notes.json");

export type VisibilityState = "visible" | "minimized";

export interface Note {
  id: string;
  title: string;
  content: string;
  visibilityState: VisibilityState;
  /** ISO 8601 — CueNow encodes dates with `JSONEncoder.DateEncodingStrategy.iso8601`. */
  creationDate: string;
  colorTheme: string;
  deletedAt?: string | null;
}

interface NotesFile {
  schemaVersion: number;
  notes: Note[];
}

/** Matches `Note.untitledDisplayTitle` in the app, for notes with no derived title. */
export const UNTITLED_TITLE = "Untitled Note";

/**
 * Every note CueNow currently holds, newest first.
 *
 * Deleted notes live in a separate `deletedNotes.json`, but a note carrying `deletedAt`
 * is filtered out regardless — the trash is not something to offer in a launcher.
 */
export async function loadNotes(): Promise<Note[]> {
  let raw: string;

  try {
    raw = await readFile(NOTES_FILE, "utf8");
  } catch (error) {
    // A missing file is the normal state before CueNow has ever saved, not a failure.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const parsed = JSON.parse(raw) as NotesFile;

  return (parsed.notes ?? [])
    .filter((note) => !note.deletedAt)
    .sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
}

/** The title CueNow would show for this note, falling back the way the app does. */
export function displayTitle(note: Note): string {
  const title = note.title.trim();
  if (title.length > 0) {
    return title;
  }

  const firstLine = note.content.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.trim() ?? UNTITLED_TITLE;
}

/**
 * Whether a note matches what the user typed.
 *
 * Title *and* body are searched, so a note can be found by something written inside it.
 * Raycast's built-in filtering only looks at title, subtitle and keywords, which is why
 * the list sets `filtering={false}` and calls this instead.
 */
export function matchesSearch(note: Note, searchText: string): boolean {
  const needle = searchText.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }

  const haystack = `${displayTitle(note)}\n${note.content}`.toLowerCase();
  return needle.split(/\s+/).every((term) => haystack.includes(term));
}
