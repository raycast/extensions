import { Tool } from "@raycast/api";
import { completeTask, getTask } from "../lib/sunsama-client";

type Input = {
  /** The task id, from get-tasks. */
  taskId: string;
};

/** Mark a task as completed today. */
export default async function tool(input: Input) {
  await completeTask(input.taskId);
  return { completed: true };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const task = await getTask(input.taskId);
  return {
    message: "Mark this task as completed?",
    info: [{ name: "Task", value: task?.title ?? input.taskId }],
  };
};
