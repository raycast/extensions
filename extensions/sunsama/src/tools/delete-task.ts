import { Action, Tool } from "@raycast/api";
import { deleteTask, getTask } from "../lib/sunsama-client";

type Input = {
  /** The task id, from get-tasks. */
  taskId: string;
};

/** Delete a task. This cannot be undone. */
export default async function tool(input: Input) {
  await deleteTask(input.taskId);
  return { deleted: true };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const task = await getTask(input.taskId);
  return {
    style: Action.Style.Destructive,
    message: "Delete this task? This cannot be undone.",
    info: [{ name: "Task", value: task?.title ?? input.taskId }],
  };
};
