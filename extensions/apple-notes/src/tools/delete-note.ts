import { Action, Tool } from "@raycast/api";

import { deleteNoteById } from "../api/applescript";
import { resolveAppleNoteId } from "../helpers";

type Input = {
  /** The note identifier. Use the "id" value from search-notes when possible. */
  noteId: string;
  /** The title of the note, used to display in the confirmation dialog. */
  noteTitle?: string;
};

export default async function (input: Input) {
  const noteId = await resolveAppleNoteId(input.noteId);
  return deleteNoteById(noteId);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Destructive,
    message: `Are you sure you want to delete note "${input.noteId}"?`,
  };
};
