import { Note } from "./interfaces";

export function filterNotes(notes: Note[], input: string, byContent: boolean) {
  if (input.length === 0) {
    return notes;
  }

  if (byContent) {
    return notes.filter(
      (note) => note.content.includes(input) || note.title.includes(input) || note.path.includes(input)
    );
  } else {
    return notes.filter((note) => note.title.toLowerCase().includes(input.toLowerCase()));
  }
}
