import { Tool } from "@raycast/api";
import { completeTask } from "../tasks";
import { describe, run } from "./create-task";

type Input = {
  /**
   * Task id.
   */
  id: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return { message: `Complete task ${input.id}?` };
};

/**
 * Mark a task completed. Returns the updated task.
 */
export default async function tool(input: Input): Promise<string> {
  const task = await run((api) => completeTask(api, input.id));
  return `Completed ${describe(task)}`;
}
