import type { Note } from "../types";

export function sortByPinned(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.isPinned === b.isPinned) return 0;
    return a.isPinned ? -1 : 1;
  });
}
