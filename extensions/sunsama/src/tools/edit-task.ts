import { Tool } from "@raycast/api";
import {
  editNotes,
  editTitle,
  getTask,
  plannedTimeSteps,
  setChannel,
  subtasksWithPlannedTime,
} from "../lib/sunsama-client";

type Input = {
  /** The task id, from get-tasks. */
  taskId: string;
  /** A new title. */
  title?: string;
  /** New notes in Markdown. Replaces the existing notes entirely. */
  notes?: string;
  /**
   * New planned time in whole minutes. Subtask planned times are cleared
   * first, since Sunsama derives the task total from them.
   */
  timeEstimate?: number;
  /** The channel name to move it to. Use the exact name from get-channels. */
  channel?: string;
};

/**
 * Edit a task's title, notes, planned time, or channel. Only the fields given
 * are changed.
 *
 * Each field is its own request to Sunsama, so one can fail after another has
 * already landed. Every field is attempted, and the result says which ones
 * changed and which failed, so a retry can be limited to what didn't take.
 */
export default async function tool(input: Input) {
  const { taskId } = input;
  const edits: Array<[string, () => Promise<void>]> = [];

  if (input.title?.trim()) {
    const title = input.title.trim();
    edits.push(["title", () => editTitle(taskId, title)]);
  }
  if (typeof input.notes === "string") {
    const notes = input.notes;
    edits.push(["notes", () => editNotes(taskId, notes)]);
  }
  if (typeof input.timeEstimate === "number") {
    const minutes = input.timeEstimate;
    // Sunsama derives the task total from subtask estimates and rejects a
    // task-level one while any exist, so those are cleared first.
    edits.push([
      "timeEstimate",
      async () => {
        const task = await getTask(taskId);
        const steps = plannedTimeSteps(
          taskId,
          minutes,
          task ? subtasksWithPlannedTime(task) : [],
        );
        for (const step of steps) await step.run();
      },
    ]);
  }
  if (input.channel?.trim()) {
    const channel = input.channel.trim();
    edits.push(["channel", () => setChannel(taskId, channel)]);
  }

  if (edits.length === 0) throw new Error("Nothing to change.");

  const changed: string[] = [];
  const failed: Array<{ field: string; error: string }> = [];
  for (const [field, run] of edits) {
    try {
      await run();
      changed.push(field);
    } catch (error) {
      failed.push({
        field,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (changed.length === 0) throw new Error(failed[0].error);
  return { changed, failed };
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
