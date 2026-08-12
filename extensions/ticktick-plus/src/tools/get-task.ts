import { getTask } from "../api/tasks";
import { loadSyncData, priorityLabel, summarizeTask } from "./lib/data";

type Input = {
  /** Task ID */
  taskId: string;
  /** Project ID */
  projectId: string;
};

/**
 * Fetch a single TickTick task by ID, including subtasks when available.
 */
export default async function tool(input: Input) {
  if (!input.taskId || !input.projectId) {
    throw new Error("taskId and projectId are required.");
  }

  const task = await getTask(input.projectId, input.taskId);
  const sync = await loadSyncData();
  const projectName = sync.projects.find((p) => p.id === task.projectId)?.name;

  return {
    task: {
      ...summarizeTask(task, projectName),
      priorityLabel: priorityLabel(task.priority),
      subtasks: (task.items ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        completed: item.status === 2,
      })),
    },
  };
}
