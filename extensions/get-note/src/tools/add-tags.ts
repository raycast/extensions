import { Tool } from "@raycast/api";

import { addTags } from "../lib/api";

type Input = {
  /**
   * The GetNote note ID.
   */
  noteId: string;
  /**
   * Tags to add to the note.
   */
  tags: string[];
};

export default async function addTagsTool(input: Input) {
  const result = await addTags(input.noteId, input.tags);

  return {
    noteId: result.noteId,
    tags: result.tags,
    addedCount: result.tags.length,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Add tags to this GetNote note?",
    info: [
      { name: "Note ID", value: input.noteId },
      { name: "Tags", value: input.tags.join(", ") },
    ],
  };
};
