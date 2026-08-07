import { Tool } from "@raycast/api";
import { moveTask } from "../api/tasks";
import { runBatch } from "./lib/batch";
import { batchConfirmation } from "./lib/confirm";
import { canonicalTaskLabel, findProjectByName, loadSyncData } from "./lib/data";

type TaskMove = {
  /** Task ID */
  taskId: string;
  /** Current project ID */
  fromProjectId: string;
};

type Input = {
  /** Tasks to move */
  tasks: TaskMove[];
  /** Destination project ID */
  toProjectId?: string;
  /** Destination project name if ID unknown */
  toProjectName?: string;
};

type PreparedMove = { taskId: string; fromProjectId: string; toProjectId: string; title: string };

/** Validate the whole batch and resolve the destination before any task is moved. */
async function prepareMoves(input: Input): Promise<{ moves: PreparedMove[]; toProjectName: string }> {
  const tasks = input.tasks ?? [];
  if (tasks.length === 0) {
    throw new Error("Provide at least one task in `tasks`.");
  }

  for (const task of tasks) {
    if (!task.taskId || !task.fromProjectId) {
      throw new Error("Each task requires taskId and fromProjectId.");
    }
  }

  const sync = await loadSyncData();
  const openProjects = sync.projects.filter((p) => !p.closed);

  let toProjectId = input.toProjectId?.trim();
  if (!toProjectId && input.toProjectName) {
    const match = findProjectByName(openProjects, input.toProjectName);
    if (!match) throw new Error(`Project "${input.toProjectName}" not found.`);
    toProjectId = match.id;
  }
  if (!toProjectId) {
    throw new Error("Provide toProjectId or toProjectName.");
  }

  const destination = sync.projects.find((p) => p.id === toProjectId);
  if (!destination) {
    throw new Error(`Project "${toProjectId}" not found. Call list-projects and retry with a current projectId.`);
  }

  return {
    toProjectName: destination.name,
    moves: tasks.map((t) => ({
      taskId: t.taskId,
      fromProjectId: t.fromProjectId,
      toProjectId: destination.id,
      title: canonicalTaskLabel(sync.tasks, { taskId: t.taskId, projectId: t.fromProjectId }),
    })),
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tasks = input.tasks ?? [];
  if (tasks.length <= 1) return undefined;
  const { moves, toProjectName } = await prepareMoves(input);
  return batchConfirmation(moves.length, `Move ${moves.length} tasks to "${toProjectName}"?`, [
    ...moves.slice(0, 8).map((m) => ({ name: "Task", value: m.title })),
    { name: "Destination", value: toProjectName },
  ]);
};

/**
 * Move tasks to another project. Provide toProjectId or toProjectName.
 */
export default async function tool(input: Input) {
  const { moves, toProjectName } = await prepareMoves(input);

  const moved = await runBatch(moves, async (move) => {
    await moveTask(move.fromProjectId, move.toProjectId, move.taskId);
    return move;
  });

  return { moved, toProjectName, count: moved.length };
}
