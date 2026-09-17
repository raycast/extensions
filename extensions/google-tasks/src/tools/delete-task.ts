import { Action, Tool } from "@raycast/api";
import { deleteTask } from "../api/endpoints";
import { requireTask } from "./shared";

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

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const task = await requireTask(input.listId, input.taskId);
  return {
    style: Action.Style.Destructive,
    message: 'Delete "' + task.title + '"? This cannot be undone from the extension.',
  };
};

/**
 * Permanently delete a Google task.
 */
export default async function (input: Input) {
  const task = await requireTask(input.listId, input.taskId);
  await deleteTask(task.listId, task.id);
  return { id: task.id, listId: task.listId, title: task.title, deleted: true };
}
