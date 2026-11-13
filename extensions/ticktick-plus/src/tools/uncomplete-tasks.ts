import { Tool } from "@raycast/api";
import { getTask, uncompleteTask } from "../api/tasks";
import { Task } from "../types/ticktick";
import { runBatch } from "./lib/batch";
import { destructiveConfirmation } from "./lib/confirm";

type TaskRef = {
  /** Task ID */
  taskId: string;
  /** Project ID */
  projectId: string;
};

type Input = {
  /** Completed tasks to reopen */
  tasks: TaskRef[];
};

/**
 * Fetch every task first. This validates the whole batch before the first mutation and
 * gives the confirmation the stored titles behind the IDs rather than caller-supplied text.
 */
async function prepareTasks(input: Input): Promise<Task[]> {
  const tasks = input.tasks ?? [];
  if (tasks.length === 0) {
    throw new Error("Provide at least one task in `tasks`.");
  }

  for (const task of tasks) {
    if (!task.taskId || !task.projectId) {
      throw new Error("Each task requires taskId and projectId.");
    }
  }

  return Promise.all(tasks.map((ref) => getTask(ref.projectId, ref.taskId)));
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Let the tool raise the validation error for an empty batch rather than spending
  // fetches to confirm nothing.
  if ((input.tasks ?? []).length === 0) return undefined;
  const tasks = await prepareTasks(input);
  return destructiveConfirmation(
    `Reopen ${tasks.length} task${tasks.length === 1 ? "" : "s"}?`,
    tasks.slice(0, 8).map((t) => ({ name: "Task", value: t.title })),
  );
};

/**
 * Reopen one or more completed TickTick tasks (uncomplete). Always asks for confirmation.
 */
export default async function tool(input: Input) {
  const tasks = await prepareTasks(input);

  const reopened = await runBatch(tasks, async (task) => {
    await uncompleteTask(task);
    return { taskId: task.id, projectId: task.projectId, title: task.title };
  });

  return { reopened, count: reopened.length };
}
