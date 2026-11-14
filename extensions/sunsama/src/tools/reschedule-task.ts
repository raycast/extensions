import { Tool } from "@raycast/api";
import { getTask, rescheduleTask } from "../lib/sunsama-client";

type Input = {
  /** The task id, from get-tasks. */
  taskId: string;
  /**
   * The day to move it to, as YYYY-MM-DD in the user's local timezone. Leave
   * empty to send it to the backlog instead.
   */
  day?: string;
};

/** Move a task to another day, or to the backlog. */
export default async function tool(input: Input) {
  const day = input.day?.trim() || null;
  await rescheduleTask(input.taskId, day);
  return { movedTo: day ?? "backlog" };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const task = await getTask(input.taskId);
  return {
    message: input.day?.trim()
      ? `Move this task to ${input.day.trim()}?`
      : "Move this task to the backlog?",
    info: [{ name: "Task", value: task?.title ?? input.taskId }],
  };
};
