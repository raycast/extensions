import { listPropertyDefinitions } from "../api/events";
import { getActiveProjectId, paginate } from "./_shared";

type Input = {
  /** Whether to fetch event properties or person properties. Defaults to "event". */
  type?: "event" | "person";
  /** Optional search term to filter property names. */
  search?: string;
  /** Maximum number of properties to return. Defaults to 20. */
  limit?: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { count, results } = await listPropertyDefinitions(projectId, {
    type: input.type ?? "event",
    search: input.search,
    limit: input.limit ?? 100,
  });
  const { items, truncated, total } = paginate(results, count, input.limit ?? 20);
  return {
    truncated,
    total,
    properties: items.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.property_type,
      is_numerical: p.is_numerical,
    })),
  };
}
