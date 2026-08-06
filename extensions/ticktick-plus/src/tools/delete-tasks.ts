import { Tool } from "@raycast/api";
import { deleteTask } from "../api/tasks";
import { destructiveConfirmation } from "./lib/confirm";
import { loadSyncData } from "./lib/data";

type TaskRef = {
  /** Task ID from search-tasks */
  taskId: string;
  /** Project ID from search-tasks */
  projectId: string;
  /** Optional title shown in confirmation */
  title?: string;
};

type Input = {
  /** Tasks to delete permanently */
  tasks: TaskRef[];
};

function canonicalTaskLabel(tasks: Awaited<ReturnType<typeof loadSyncData>>["tasks"], ref: TaskRef): string {
  const found = tasks.find((t) => t.id === ref.taskId && t.projectId === ref.projectId);
  return found?.title ?? ref.taskId;
}

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

  for (const task of tasks) {
    await deleteTask(task.projectId, task.taskId);
  }

  return {
    deleted: tasks.map((t) => ({ taskId: t.taskId, projectId: t.projectId, title: t.title })),
    count: tasks.length,
  };
}
