import { Tool } from "@raycast/api";
import { deleteTask } from "../api/tasks";
import { runBatch } from "./lib/batch";
import { destructiveConfirmation } from "./lib/confirm";
import { loadSyncData, resolveTaskRefs } from "./lib/data";

type TaskRef = {
  /** Task ID from search-tasks */
  taskId: string;
  /** Project ID from search-tasks */
  projectId: string;
};

type Input = {
  /** Tasks to delete permanently */
  tasks: TaskRef[];
};

/** Validate the whole batch and resolve every reference to a real task before deleting. */
async function prepareTasks(input: Input) {
  const tasks = input.tasks ?? [];
  if (tasks.length === 0) {
    throw new Error("Provide at least one task in `tasks`.");
  }

  for (const task of tasks) {
    if (!task.taskId || !task.projectId) {
      throw new Error("Each task requires taskId and projectId.");
    }
  }

  const sync = await loadSyncData();
  return resolveTaskRefs(tasks, sync.tasks);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Let the tool raise the validation error for an empty batch rather than spending a
  // sync fetch to confirm nothing.
  if ((input.tasks ?? []).length === 0) return undefined;
  const prepared = await prepareTasks(input);
  return destructiveConfirmation(
    `Delete ${prepared.length} task${prepared.length === 1 ? "" : "s"}? This cannot be undone.`,
    prepared.slice(0, 8).map((t) => ({ name: "Task", value: t.title })),
  );
};

/**
 * Permanently delete TickTick tasks. Always asks for confirmation. Prefer complete-tasks when the user means "done".
 */
export default async function tool(input: Input) {
  const prepared = await prepareTasks(input);

  const deleted = await runBatch(prepared, async (task) => {
    await deleteTask(task.projectId, task.taskId);
    return task;
  });

  return { deleted, count: deleted.length };
}
