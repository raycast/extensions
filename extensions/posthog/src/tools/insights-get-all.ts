import { listInsights } from "../api/insights";
import { getActiveProjectId, paginate, projectUrl } from "./_shared";

type Input = {
  /** Optional search term to filter insight names. */
  search?: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { results } = await listInsights(projectId, input.search ? { search: input.search } : undefined);
  const { items, truncated, total } = paginate(results);
  return {
    truncated,
    total,
    insights: items.map((i) => ({
      id: i.id,
      short_id: i.short_id,
      name: i.name || i.derived_name,
      favorited: i.favorited,
      last_modified_at: i.last_modified_at,
      url: projectUrl(`insights/${i.short_id}`),
    })),
  };
}
