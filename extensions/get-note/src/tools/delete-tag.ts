import { Tool } from "@raycast/api";

import { deleteTag } from "../lib/api";

type Input = {
  /**
   * The GetNote note ID.
   */
  noteId: string;
  /**
   * The tag ID to delete.
   */
  tagId: string;
};

export default async function deleteTagTool(input: Input) {
  await deleteTag(input.noteId, input.tagId);

  return {
    noteId: input.noteId,
    tagId: input.tagId,
    deleted: true,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Delete this tag from the note?",
    info: [
      { name: "Note ID", value: input.noteId },
      { name: "Tag ID", value: input.tagId },
    ],
  };
};
