import { setTaskStatus } from "../api/endpoints";
import { requireTask } from "./shared";
import { isCompleted } from "../utils";

type Input = {
  /**
   * The task id from search-tasks. Never invent an id.
   */
  taskId: string;
  /**
   * The list id from search-tasks. Never invent a list id.
   */
  listId: string;
};

/**
 * Mark a Google task as completed.
 */
export default async function (input: Input) {
  const task = await requireTask(input.listId, input.taskId);
  if (!isCompleted(task)) {
    await setTaskStatus(task.listId, task, "completed");
  }
  return { id: task.id, listId: task.listId, title: task.title, status: "completed" };
}
