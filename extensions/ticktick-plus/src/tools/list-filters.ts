import { getFilters } from "../api/ticktick";
import { loadSyncData } from "./lib/data";

/**
 * List TickTick smart lists / filters. Use get-filter-tasks with a filter's rule or id to fetch matching tasks.
 */
export default async function tool() {
  const sync = await loadSyncData();
  let filters = sync.filters;
  if (filters.length === 0) {
    filters = await getFilters();
  }

  return {
    filters: filters.map((f) => ({
      id: f.id,
      name: f.name,
      rule: f.rule,
    })),
    count: filters.length,
  };
}
