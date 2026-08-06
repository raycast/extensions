import { Tool } from "@raycast/api";
import { completeTask } from "../api/tasks";
import { batchConfirmation } from "./lib/confirm";

type TaskRef = {
  /** Task ID from search-tasks */
  taskId: string;
  /** Project ID from search-tasks */
  projectId: string;
  /** Optional title shown in confirmation */
  title?: string;
};

type Input = {
  /** Tasks to mark complete. Confirmation is required when completing more than one. */
  tasks: TaskRef[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tasks = input.tasks ?? [];
  return batchConfirmation(
    tasks.length,
    `Complete ${tasks.length} tasks?`,
    tasks.slice(0, 8).map((t) => ({ name: "Task", value: t.title ?? t.taskId })),
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
    await completeTask(task.projectId, task.taskId);
  }

  return {
    completed: tasks.map((t) => ({ taskId: t.taskId, projectId: t.projectId, title: t.title })),
    count: tasks.length,
  };
}
