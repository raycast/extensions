import { listExperiments } from "../api/experiments";
import { getActiveProjectId, paginate, projectUrl } from "./_shared";

export default async function () {
  const projectId = await getActiveProjectId();
  const { results } = await listExperiments(projectId);
  const { items, truncated, total } = paginate(results);
  return {
    truncated,
    total,
    experiments: items.map((e) => ({
      id: e.id,
      name: e.name,
      feature_flag_key: e.feature_flag_key,
      start_date: e.start_date,
      end_date: e.end_date,
      archived: e.archived,
      url: projectUrl(`experiments/${e.id}`),
    })),
  };
}
