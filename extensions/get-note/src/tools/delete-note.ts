import { Tool } from "@raycast/api";

import { deleteNote } from "../lib/api";

type Input = {
  /**
   * The GetNote note ID to move to trash.
   */
  noteId: string;
};

export default async function deleteNoteTool(input: Input) {
  await deleteNote(input.noteId);

  return {
    noteId: input.noteId,
    deleted: true,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Move this GetNote note to trash?",
    info: [{ name: "Note ID", value: input.noteId }],
  };
};
