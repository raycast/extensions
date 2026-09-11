import { filterTasks } from "../api/tasks";
import { getFilters } from "../api/ticktick";
import { loadSyncData, priorityLabel, summarizeTask } from "./lib/data";

type Input = {
  /** Filter / smart list ID from list-filters */
  filterId?: string;
  /** Filter name if ID unknown */
  filterName?: string;
  /** Raw TickTick filter rule (advanced) */
  rule?: string;
  /** Max results (default 30, max 50) */
  limit?: number;
};

/**
 * Get tasks matching a TickTick smart list / filter. Call list-filters first.
 */
export default async function tool(input: Input) {
  let rule = input.rule;
  if (!rule) {
    const sync = await loadSyncData();
    let filters = sync.filters;
    if (filters.length === 0) filters = await getFilters();

    const match = input.filterId
      ? filters.find((f) => f.id === input.filterId)
      : input.filterName
        ? filters.find((f) => f.name.toLowerCase() === input.filterName!.toLowerCase())
        : undefined;

    if (!match?.rule) {
      throw new Error("Provide filterId, filterName, or rule. Call list-filters if needed.");
    }
    rule = match.rule;
  }

  const sync = await loadSyncData();
  const projectMap = new Map(sync.projects.map((p) => [p.id, p.name]));
  const tasks = await filterTasks(rule);
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 50);
  const sliced = tasks.slice(0, limit);

  return {
    tasks: sliced.map((task) => ({
      ...summarizeTask(task, projectMap.get(task.projectId)),
      priorityLabel: priorityLabel(task.priority),
    })),
    count: sliced.length,
    totalMatches: tasks.length,
  };
}
