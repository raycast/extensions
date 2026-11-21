import { Tool } from "@raycast/api";
import { amplenote } from "../lib/amplenote";
import { taskTitle } from "../lib/tasks";
import { describeError, requireTask, taskConfirmation } from "./shared";

type Input = {
  /**
   * The taskUUID from search-tasks. Never invent an id.
   */
  taskUUID: string;
};

export const confirmation: Tool.Confirmation<Input> = taskConfirmation;

/**
 * Mark an Amplenote task as completed. reopen-task can undo this.
 */
export default async function (input: Input) {
  try {
    const task = await requireTask(input.taskUUID);
    if (!task.completedAt) await amplenote.completeTask(task.uuid);
    return { taskUUID: task.uuid, title: taskTitle(task.content), status: "completed" };
  } catch (error) {
    describeError(error);
  }
}
