import { setTaskStatus } from "../api/endpoints";
import { requireTask } from "./shared";
import { isCompleted } from "../utils";

type Input = {
  /**
   * The task id from search-tasks, usually with view=completed. Never invent an id.
   */
  taskId: string;
  /**
   * The list id from search-tasks. Never invent a list id.
   */
  listId: string;
};

/**
 * Reopen a completed Google task.
 */
export default async function (input: Input) {
  const task = await requireTask(input.listId, input.taskId);
  if (isCompleted(task)) {
    await setTaskStatus(task.listId, task, "needsAction");
  }
  return { id: task.id, listId: task.listId, title: task.title, status: "open" };
}
