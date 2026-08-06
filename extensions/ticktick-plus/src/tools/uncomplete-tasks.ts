import { Action, Tool } from "@raycast/api";
import { getTask, uncompleteTask } from "../api/tasks";

type TaskRef = {
  /** Task ID */
  taskId: string;
  /** Project ID */
  projectId: string;
  /** Optional title shown in confirmation */
  title?: string;
};

type Input = {
  /** Completed tasks to reopen */
  tasks: TaskRef[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tasks = input.tasks ?? [];
  return {
    style: Action.Style.Destructive,
    message: `Reopen ${tasks.length} task${tasks.length === 1 ? "" : "s"}?`,
    info: tasks.slice(0, 8).map((t) => ({ name: "Task", value: t.title ?? t.taskId })),
  };
};

/**
 * Reopen one or more completed TickTick tasks (uncomplete). Always asks for confirmation.
 */
export default async function tool(input: Input) {
  const tasks = input.tasks ?? [];
  if (tasks.length === 0) {
    throw new Error("Provide at least one task in `tasks`.");
  }

  const results = [];
  for (const ref of tasks) {
    const task = await getTask(ref.projectId, ref.taskId);
    await uncompleteTask(task);
    results.push({ taskId: ref.taskId, projectId: ref.projectId, title: task.title });
  }

  return { reopened: results, count: results.length };
}
