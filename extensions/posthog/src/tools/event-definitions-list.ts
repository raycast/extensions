import { listEventDefinitions } from "../api/events";
import { getActiveProjectId, paginate } from "./_shared";

type Input = {
  /** Optional search term to filter event names. */
  search?: string;
  /** Maximum number of events to return. Defaults to 20. */
  limit?: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { count, results } = await listEventDefinitions(projectId, {
    search: input.search,
    limit: input.limit ?? 100,
  });
  const { items, truncated, total } = paginate(results, count, input.limit ?? 20);
  return {
    truncated,
    total,
    events: items.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      volume_30_day: e.volume_30_day,
      last_seen_at: e.last_seen_at,
    })),
  };
}
