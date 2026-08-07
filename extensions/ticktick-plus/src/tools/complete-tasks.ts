import { Tool } from "@raycast/api";
import { completeTask } from "../api/tasks";
import { runBatch } from "./lib/batch";
import { batchConfirmation } from "./lib/confirm";
import { loadSyncData, resolveTaskRefs } from "./lib/data";

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

/** Validate the whole batch and resolve every reference to a real task before mutating. */
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
  const tasks = input.tasks ?? [];
  if (tasks.length <= 1) return undefined;
  const prepared = await prepareTasks(input);
  return batchConfirmation(
    prepared.length,
    `Complete ${prepared.length} tasks?`,
    prepared.slice(0, 8).map((t) => ({ name: "Task", value: t.title })),
  );
};

/**
 * Mark one or more TickTick tasks as complete. Call search-tasks first to get taskId and projectId.
 */
export default async function tool(input: Input) {
  const prepared = await prepareTasks(input);

  const completed = await runBatch(prepared, async (task) => {
    await completeTask(task.projectId, task.taskId);
    return task;
  });

  return { completed, count: completed.length };
}
