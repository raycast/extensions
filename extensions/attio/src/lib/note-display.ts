import type { Note } from "../api/types";

/** Title → first non-empty plaintext line (≤60 chars) → "Untitled note" (spec §8.5). */
export function noteListTitle(note: Note): string {
  if (note.title?.trim()) return note.title.trim();
  const line = (note.content_plaintext ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  if (!line) return "Untitled note";
  return line.length > 60 ? line.slice(0, 60) + "…" : line;
}
