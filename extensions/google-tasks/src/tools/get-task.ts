import { compactTask, requireTask } from "./shared";

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
 * Get the full content of a Google task.
 */
export default async function (input: Input) {
  const task = await requireTask(input.listId, input.taskId);
  const compact = compactTask(task);
  return {
    ...compact,
    notes: task.notes ?? "",
    completed: task.completed ?? null,
  };
}
