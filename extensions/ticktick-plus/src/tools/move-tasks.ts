import { Tool } from "@raycast/api";
import { moveTask } from "../api/tasks";
import { batchConfirmation } from "./lib/confirm";
import { findProjectByName, loadSyncData } from "./lib/data";

type TaskMove = {
  /** Task ID */
  taskId: string;
  /** Current project ID */
  fromProjectId: string;
  /** Optional title for confirmation */
  title?: string;
};

type Input = {
  /** Tasks to move */
  tasks: TaskMove[];
  /** Destination project ID */
  toProjectId?: string;
  /** Destination project name if ID unknown */
  toProjectName?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tasks = input.tasks ?? [];
  return batchConfirmation(
    tasks.length,
    `Move ${tasks.length} tasks?`,
    tasks.slice(0, 8).map((t) => ({ name: "Task", value: t.title ?? t.taskId })),
  );
};

/**
 * Move tasks to another project. Provide toProjectId or toProjectName.
 */
export default async function tool(input: Input) {
  const tasks = input.tasks ?? [];
  if (tasks.length === 0) {
    throw new Error("Provide at least one task in `tasks`.");
  }

  let toProjectId = input.toProjectId?.trim();
  if (!toProjectId && input.toProjectName) {
    const sync = await loadSyncData();
    const match = findProjectByName(
      sync.projects.filter((p) => !p.closed),
      input.toProjectName,
    );
    if (!match) throw new Error(`Project "${input.toProjectName}" not found.`);
    toProjectId = match.id;
  }
  if (!toProjectId) {
    throw new Error("Provide toProjectId or toProjectName.");
  }

  for (const task of tasks) {
    await moveTask(task.fromProjectId, toProjectId, task.taskId);
  }

  return {
    moved: tasks.map((t) => ({
      taskId: t.taskId,
      fromProjectId: t.fromProjectId,
      toProjectId,
      title: t.title,
    })),
    count: tasks.length,
  };
}
