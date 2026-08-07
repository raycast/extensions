import { Tool } from "@raycast/api";
import { deleteTask } from "../api/tasks";
import { runBatch } from "./lib/batch";
import { destructiveConfirmation } from "./lib/confirm";
import { canonicalTaskLabel, loadSyncData } from "./lib/data";

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

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tasks = input.tasks ?? [];
  const sync = await loadSyncData();
  return destructiveConfirmation(
    `Delete ${tasks.length} task${tasks.length === 1 ? "" : "s"}? This cannot be undone.`,
    tasks.slice(0, 8).map((t) => ({ name: "Task", value: canonicalTaskLabel(sync.tasks, t) })),
  );
};

/**
 * Permanently delete TickTick tasks. Always asks for confirmation. Prefer complete-tasks when the user means "done".
 */
export default async function tool(input: Input) {
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
  const prepared = tasks.map((t) => ({
    taskId: t.taskId,
    projectId: t.projectId,
    title: canonicalTaskLabel(sync.tasks, t),
  }));

  const deleted = await runBatch(prepared, async (task) => {
    await deleteTask(task.projectId, task.taskId);
    return task;
  });

  return { deleted, count: deleted.length };
}
