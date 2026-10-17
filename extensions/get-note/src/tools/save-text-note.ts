import { Tool } from "@raycast/api";

import { getNoteDetail, saveTextNote } from "../lib/api";

type Input = {
  /**
   * Optional title for the note.
   */
  title?: string;
  /**
   * Markdown content of the note.
   */
  content: string;
  /**
   * Optional tags to add to the note.
   */
  tags?: string[];
};

export default async function saveTextNoteTool(input: Input) {
  const created = await saveTextNote({
    title: input.title,
    content: input.content,
    tags: input.tags,
  });
  const note = await getNoteDetail(created.noteId);

  return {
    noteId: note.note_id,
    title: note.title,
    createdAt: note.created_at,
    tags: note.tags?.map((tag) => tag.name) || [],
    summary: note.content,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Save this content to GetNote?",
    info: [
      { name: "Title", value: input.title || "Untitled Note" },
      { name: "Content", value: input.content },
      { name: "Tags", value: input.tags?.join(", ") },
    ],
  };
};
