import { listDashboards } from "../api/dashboards";
import { getActiveProjectId, paginate, projectUrl } from "./_shared";

type Input = {
  /** Optional search term to filter dashboard names. */
  search?: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { count, results } = await listDashboards(projectId);
  const filtered = input.search
    ? results.filter((d) => d.name.toLowerCase().includes(input.search!.toLowerCase()))
    : results;
  // When the user filters client-side, report the filter result count; otherwise the server count.
  const total = input.search ? filtered.length : count;
  const { items, truncated } = paginate(filtered, total);
  return {
    truncated,
    total,
    dashboards: items.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      pinned: d.pinned,
      url: projectUrl(`dashboard/${d.id}`),
    })),
  };
}
