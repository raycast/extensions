import { Tool } from "@raycast/api";
import { createTask } from "../api/tasks";
import { runBatch, withContext } from "./lib/batch";
import { batchConfirmation } from "./lib/confirm";
import { parseDueDate } from "./lib/dates";
import { findProjectByName, loadSyncData, priorityFromLabel, requireProject, summarizeTask } from "./lib/data";

type TaskInput = {
  /** Task title */
  title: string;
  /** Project ID from list-projects. Prefer this over projectName. */
  projectId?: string;
  /** Project name to resolve if projectId is unknown. Falls back to Inbox. */
  projectName?: string;
  /** Due date in ISO 8601 (YYYY-MM-DD or full datetime) */
  dueDate?: string;
  /** Priority: none, low, medium, or high */
  priority?: string;
  /** Notes / description */
  content?: string;
  /** Tag names */
  tags?: string[];
};

type Input = {
  /** One or more tasks to create. Confirmation is required when creating more than one. */
  tasks: TaskInput[];
};

type PreparedTask = {
  title: string;
  projectId: string;
  priority: 0 | 1 | 3 | 5;
  dueDate?: string;
  isAllDay?: boolean;
  content?: string;
  tags?: string[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tasks = input.tasks ?? [];
  return batchConfirmation(
    tasks.length,
    `Create ${tasks.length} tasks?`,
    tasks.slice(0, 8).map((t) => ({ name: "Task", value: t.title })),
  );
};

/**
 * Create one or more TickTick tasks. Use list-projects first if the user names a project.
 * When pasting a daily log with multiple new tasks, pass them all in `tasks` so the user can confirm the batch.
 */
export default async function tool(input: Input) {
  const tasks = input.tasks ?? [];
  if (tasks.length === 0) {
    throw new Error("Provide at least one task in `tasks`.");
  }

  const sync = await loadSyncData();
  const openProjects = sync.projects.filter((p) => !p.closed);
  const prepared: PreparedTask[] = [];

  for (const [index, item] of tasks.entries()) {
    const context = tasks.length > 1 ? `Task ${index + 1} of ${tasks.length}: ` : "";
    const title = item.title?.trim();
    if (!title) throw new Error(`${context}Each task needs a title.`);

    let projectId = item.projectId?.trim() || undefined;
    if (projectId) {
      // Verify the ID here, not at the API call — an unknown ID rejected mid-batch would
      // leave the tasks prepared before it already created.
      projectId = requireProject(sync.projects, projectId, context).id;
    } else if (item.projectName) {
      const match = findProjectByName(openProjects, item.projectName);
      if (!match) {
        throw new Error(`${context}Project "${item.projectName}" not found. Call list-projects and retry.`);
      }
      projectId = match.id;
    }
    projectId = projectId || sync.inboxId;
    if (!projectId) {
      throw new Error("Could not resolve Inbox. Ask the user to open the Inbox command once, then retry.");
    }

    const priority = priorityFromLabel(item.priority) ?? 0;
    const due = withContext(context, () => (item.dueDate ? parseDueDate(item.dueDate) : undefined));

    prepared.push({
      title,
      projectId,
      priority,
      ...(due && { dueDate: due.dueDate, isAllDay: due.isAllDay }),
      ...(item.content?.trim() && { content: item.content.trim() }),
      ...(item.tags && item.tags.length > 0 && { tags: item.tags }),
    });
  }

  const created = await runBatch(prepared, async (item) => {
    const task = await createTask(item);
    const projectName = sync.projects.find((p) => p.id === task.projectId)?.name;
    return summarizeTask(task, projectName);
  });

  return { created, count: created.length };
}
