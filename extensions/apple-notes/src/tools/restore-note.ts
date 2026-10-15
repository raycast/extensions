import { restoreNoteById } from "../api/applescript";
import { resolveAppleNoteId } from "../helpers";

type Input = {
  /** The note identifier. Use the "id" value from search-notes when possible. */
  noteId: string;
};

export default async function (input: Input) {
  const noteId = await resolveAppleNoteId(input.noteId);
  return restoreNoteById(noteId);
}
