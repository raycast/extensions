import { Tool } from "@raycast/api";
import { amplenote } from "../lib/amplenote";
import { taskTitle } from "../lib/tasks";
import { describeError, requireTask, taskConfirmation } from "./shared";

type Input = {
  /**
   * The taskUUID from search-tasks (view=completed). Never invent an id.
   */
  taskUUID: string;
};

export const confirmation: Tool.Confirmation<Input> = taskConfirmation;

/**
 * Reopen a completed or dismissed Amplenote task.
 */
export default async function (input: Input) {
  try {
    const task = await requireTask(input.taskUUID);
    await amplenote.reopenTask(task.uuid);
    return { taskUUID: task.uuid, title: taskTitle(task.content), status: "open" };
  } catch (error) {
    describeError(error);
  }
}
