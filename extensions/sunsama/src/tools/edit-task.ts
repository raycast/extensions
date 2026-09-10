import { Tool } from "@raycast/api";
import {
  editNotes,
  editTitle,
  getTask,
  setChannel,
  setPlannedTime,
} from "../lib/sunsama-client";

type Input = {
  /** The task id, from get-tasks. */
  taskId: string;
  /** A new title. */
  title?: string;
  /** New notes in Markdown. Replaces the existing notes entirely. */
  notes?: string;
  /**
   * New planned time in whole minutes. Fails if any subtask has its own
   * planned time — Sunsama derives the task total from those.
   */
  timeEstimate?: number;
  /** The channel name to move it to. Use the exact name from get-channels. */
  channel?: string;
};

/**
 * Edit a task's title, notes, planned time, or channel. Only the fields given
 * are changed.
 */
export default async function tool(input: Input) {
  const { taskId } = input;
  const changed: string[] = [];

  if (input.title?.trim()) {
    await editTitle(taskId, input.title.trim());
    changed.push("title");
  }
  if (typeof input.notes === "string") {
    await editNotes(taskId, input.notes);
    changed.push("notes");
  }
  if (typeof input.timeEstimate === "number") {
    await setPlannedTime(taskId, input.timeEstimate);
    changed.push("timeEstimate");
  }
  if (input.channel?.trim()) {
    await setChannel(taskId, input.channel.trim());
    changed.push("channel");
  }

  if (changed.length === 0) throw new Error("Nothing to change.");
  return { changed };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const task = await getTask(input.taskId);
  return {
    message: "Apply these changes?",
    info: [
      { name: "Task", value: task?.title ?? input.taskId },
      { name: "Title", value: input.title },
      { name: "Notes", value: input.notes },
      {
        name: "Planned time",
        value:
          typeof input.timeEstimate === "number"
            ? `${input.timeEstimate} minutes`
            : undefined,
      },
      { name: "Channel", value: input.channel },
    ],
  };
};
