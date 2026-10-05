import { Tool } from "@raycast/api";
import { updateTask } from "../api/tasks";
import { moveTask } from "../api/tasks";
import { runBatch, withContext } from "./lib/batch";
import { batchConfirmation } from "./lib/confirm";
import { parseDueDate } from "./lib/dates";
import {
  findProjectByName,
  loadSyncData,
  priorityFromLabel,
  requireProject,
  resolveTaskRefs,
  summarizeTask,
} from "./lib/data";

type TaskUpdate = {
  /** Task ID from search-tasks or get-task */
  taskId: string;
  /** Project ID the task currently belongs to */
  projectId: string;
  /** New title */
  title?: string;
  /** New notes / description */
  content?: string;
  /** New due date in ISO 8601. Omit to leave unchanged. */
  dueDate?: string;
  /** Set true to clear the due date */
  clearDueDate?: boolean;
  /** Priority: none, low, medium, or high */
  priority?: string;
  /** Replacement tag list */
  tags?: string[];
  /** Move to another project by ID */
  targetProjectId?: string;
  /** Move to another project by name (resolved via list-projects) */
  targetProjectName?: string;
};

type Input = {
  /** One or more task updates. Confirmation is required when updating more than one. */
  tasks: TaskUpdate[];
};

type UpdatePayload = {
  id: string;
  projectId: string;
  title?: string;
  content?: string;
  dueDate?: string;
  isAllDay?: boolean;
  priority?: 0 | 1 | 3 | 5;
  tags?: string[];
};

type PreparedUpdate = {
  /** Set when the task must be relocated before its fields are written. */
  moveFrom?: string;
  payload: UpdatePayload;
};

/**
 * Validate the whole batch, resolve every task reference, and build each payload before
 * the first write. Returns the prepared operations alongside the resolved titles so the
 * confirmation and the tool describe the same tasks.
 */
async function prepareUpdates(input: Input): Promise<{ prepared: PreparedUpdate[]; titles: string[] }> {
  const updates = input.tasks ?? [];
  if (updates.length === 0) {
    throw new Error("Provide at least one task in `tasks`.");
  }

  for (const [index, item] of updates.entries()) {
    if (!item.taskId || !item.projectId) {
      const context = updates.length > 1 ? `Update ${index + 1} of ${updates.length}: ` : "";
      throw new Error(`${context}Each update requires taskId and projectId from search-tasks.`);
    }
  }

  const sync = await loadSyncData();
  const openProjects = sync.projects.filter((p) => !p.closed);

  // Same guarantee as the other batch tools: a stale or cross-project reference is
  // rejected here rather than by TickTick, once earlier updates have been written.
  const resolved = await resolveTaskRefs(
    updates.map((item) => ({ taskId: item.taskId, projectId: item.projectId })),
    sync.tasks,
  );

  const prepared: PreparedUpdate[] = [];

  for (const [index, item] of updates.entries()) {
    const context = updates.length > 1 ? `Update ${index + 1} of ${updates.length}: ` : "";
    requireProject(sync.projects, item.projectId, context);

    let targetProjectId = item.targetProjectId?.trim() || undefined;
    if (targetProjectId) {
      // Validate before any update runs, so an unknown destination cannot be rejected
      // remotely after earlier updates were written.
      targetProjectId = requireProject(sync.projects, targetProjectId, context).id;
    } else if (item.targetProjectName) {
      const match = findProjectByName(openProjects, item.targetProjectName);
      if (!match) {
        throw new Error(`${context}Project "${item.targetProjectName}" not found.`);
      }
      targetProjectId = match.id;
    }

    const priority = priorityFromLabel(item.priority);
    const due = withContext(context, () => (item.dueDate ? parseDueDate(item.dueDate) : undefined));

    prepared.push({
      // A cross-project move is applied separately below — the update endpoint cannot
      // relocate a task, it only writes fields within the project it already lives in.
      moveFrom: targetProjectId && targetProjectId !== item.projectId ? item.projectId : undefined,
      payload: {
        id: item.taskId,
        projectId: targetProjectId ?? item.projectId,
        ...(item.title !== undefined && { title: item.title }),
        ...(item.content !== undefined && { content: item.content }),
        ...(item.clearDueDate && { dueDate: "" }),
        ...(due && { dueDate: due.dueDate, isAllDay: due.isAllDay }),
        ...(priority !== undefined && { priority }),
        ...(item.tags !== undefined && { tags: item.tags }),
      },
    });
  }

  return { prepared, titles: resolved.map((r) => r.title) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tasks = input.tasks ?? [];
  if (tasks.length <= 1) return undefined;
  const { titles } = await prepareUpdates(input);
  return batchConfirmation(
    titles.length,
    `Update ${titles.length} tasks?`,
    titles.slice(0, 8).map((title) => ({ name: "Task", value: title })),
  );
};

/**
 * Update or reschedule TickTick tasks (title, due date, priority, tags, notes, project).
 * Call search-tasks first to obtain taskId and projectId.
 */
export default async function tool(input: Input) {
  const { prepared } = await prepareUpdates(input);
  const sync = await loadSyncData();

  const updated = await runBatch(prepared, async ({ moveFrom, payload }) => {
    // Move first so the update targets the project the task ends up in.
    if (moveFrom) {
      await moveTask(moveFrom, payload.projectId, payload.id);
    }
    const task = await updateTask(payload);
    const projectName = sync.projects.find((p) => p.id === task.projectId)?.name;
    return summarizeTask(task, projectName);
  });

  return { updated, count: updated.length };
}
