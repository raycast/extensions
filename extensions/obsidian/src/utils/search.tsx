import { Note } from "./interfaces";

export function filterNotes(notes: Note[], input: string, byContent: boolean) {
  if (input.length === 0) {
    return notes;
  }

  input = input.toLowerCase();

  if (byContent) {
    return notes.filter(
      (note) =>
        note.content.toLowerCase().includes(input) ||
        note.title.toLowerCase().includes(input) ||
        note.path.toLowerCase().includes(input)
    );
  } else {
    return notes.filter((note) => note.title.toLowerCase().includes(input));
  }
}
