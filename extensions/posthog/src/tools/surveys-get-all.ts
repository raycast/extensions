import { listSurveys } from "../api/surveys";
import { getActiveProjectId, paginate, projectUrl } from "./_shared";

type Input = {
  /** Optional search term to filter survey names. */
  search?: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { count, results } = await listSurveys(projectId);
  const filtered = input.search
    ? results.filter((s) => s.name.toLowerCase().includes(input.search!.toLowerCase()))
    : results;
  const total = input.search ? filtered.length : count;
  const { items, truncated } = paginate(filtered, total);
  return {
    truncated,
    total,
    surveys: items.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      archived: s.archived,
      start_date: s.start_date,
      end_date: s.end_date,
      url: projectUrl(`surveys/${s.id}`),
    })),
  };
}
