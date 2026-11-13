import { loadSyncData, priorityLabel, summarizeTask } from "./lib/data";

type Input = {
  /**
   * Search query matched against title, notes, and tags (case-insensitive).
   * Leave empty to list recent active tasks (capped).
   */
  query?: string;
  /** Max results to return (default 20, max 50) */
  limit?: number;
  /** Optional project ID filter */
  projectId?: string;
  /** Optional tag name filter */
  tag?: string;
};

/**
 * Search active TickTick tasks by title, notes, or tags. Use this before mutate tools to obtain taskId and projectId.
 */
export default async function tool(input: Input) {
  const sync = await loadSyncData();
  const projectMap = new Map(sync.projects.map((p) => [p.id, p.name]));
  const q = input.query?.toLowerCase().trim() ?? "";
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);

  let tasks = sync.tasks;
  if (input.projectId) {
    tasks = tasks.filter((t) => t.projectId === input.projectId);
  }
  if (input.tag) {
    const tag = input.tag.toLowerCase();
    tasks = tasks.filter((t) => t.tags?.some((x) => x.toLowerCase() === tag || x.toLowerCase().includes(tag)));
  }
  if (q) {
    tasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.content?.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q)),
    );
  }

  const results = tasks.slice(0, limit).map((task) => ({
    ...summarizeTask(task, projectMap.get(task.projectId)),
    priorityLabel: priorityLabel(task.priority),
  }));

  return { tasks: results, count: results.length, totalMatches: tasks.length };
}
