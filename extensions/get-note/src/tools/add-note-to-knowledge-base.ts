import { Tool } from "@raycast/api";

import { addNoteToKnowledgeBase } from "../lib/api";

type Input = {
  /**
   * The knowledge base topic ID.
   */
  topicId: string;
  /**
   * One or more GetNote note IDs to add.
   */
  noteIds: string[];
};

export default async function addNoteToKnowledgeBaseTool(input: Input) {
  await addNoteToKnowledgeBase(input.topicId, input.noteIds);

  return {
    topicId: input.topicId,
    noteIds: input.noteIds,
    addedCount: input.noteIds.length,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Add these notes to the knowledge base?",
    info: [
      { name: "Topic ID", value: input.topicId },
      { name: "Note IDs", value: input.noteIds.join(", ") },
    ],
  };
};
