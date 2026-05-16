import { listDashboards } from "../api/dashboards";
import { getActiveProjectId, paginate, projectUrl } from "./_shared";

type Input = {
  /** Optional search term to filter dashboard names. */
  search?: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { results } = await listDashboards(projectId);
  const filtered = input.search
    ? results.filter((d) => d.name.toLowerCase().includes(input.search!.toLowerCase()))
    : results;
  const { items, truncated, total } = paginate(filtered);
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
