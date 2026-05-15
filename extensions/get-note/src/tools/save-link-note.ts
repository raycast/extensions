import { Tool } from "@raycast/api";

import { getNoteDetail, saveLinkNote, waitForTask } from "../lib/api";

type Input = {
  /**
   * The public URL to save into GetNote.
   */
  url: string;
};

export default async function saveLinkNoteTool(input: Input) {
  const task = await saveLinkNote(input.url);
  const noteId = await waitForTask(task.task_id);
  const note = await getNoteDetail(noteId);

  return {
    taskId: task.task_id,
    noteId: note.note_id,
    title: note.title,
    createdAt: note.created_at,
    summary: note.content,
    sourceUrl: note.web_page?.url,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Save this link to GetNote?",
    info: [{ name: "URL", value: input.url }],
  };
};
