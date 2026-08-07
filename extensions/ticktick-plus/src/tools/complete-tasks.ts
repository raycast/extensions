import { Tool } from "@raycast/api";
import { completeTask } from "../api/tasks";
import { runBatch } from "./lib/batch";
import { batchConfirmation } from "./lib/confirm";
import { canonicalTaskLabel, loadSyncData } from "./lib/data";

type TaskRef = {
  /** Task ID from search-tasks */
  taskId: string;
  /** Project ID from search-tasks */
  projectId: string;
};

type Input = {
  /** Tasks to mark complete. Confirmation is required when completing more than one. */
  tasks: TaskRef[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tasks = input.tasks ?? [];
  if (tasks.length <= 1) return undefined;
  const sync = await loadSyncData();
  return batchConfirmation(
    tasks.length,
    `Complete ${tasks.length} tasks?`,
    tasks.slice(0, 8).map((t) => ({ name: "Task", value: canonicalTaskLabel(sync.tasks, t) })),
  );
};

/**
 * Mark one or more TickTick tasks as complete. Call search-tasks first to get taskId and projectId.
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

  const completed = await runBatch(prepared, async (task) => {
    await completeTask(task.projectId, task.taskId);
    return task;
  });

  return { completed, count: completed.length };
}
