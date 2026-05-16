import { listFeatureFlags } from "../api/flags";
import { getActiveProjectId, paginate, projectUrl } from "./_shared";

type Input = {
  /** Optional search term to filter flag keys/names. */
  search?: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { count, results } = await listFeatureFlags(projectId);
  const filtered = input.search
    ? results.filter(
        (f) =>
          f.key.toLowerCase().includes(input.search!.toLowerCase()) ||
          (f.name ?? "").toLowerCase().includes(input.search!.toLowerCase()),
      )
    : results;
  const total = input.search ? filtered.length : count;
  const { items, truncated } = paginate(filtered, total);
  return {
    truncated,
    total,
    flags: items.map((f) => ({
      id: f.id,
      key: f.key,
      name: f.name,
      active: f.active,
      url: projectUrl(`feature_flags/${f.id}`),
    })),
  };
}
