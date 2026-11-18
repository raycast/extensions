import { getNoteBody } from "../api/applescript";
import { resolveAppleNoteId } from "../helpers";

type Input = {
  /** The note identifier. Use the "id" value from search-notes when possible. */
  noteId: string;
};

export default async function (input: Input) {
  const noteId = await resolveAppleNoteId(input.noteId);
  const note = await getNoteBody(noteId);
  return note;
}
