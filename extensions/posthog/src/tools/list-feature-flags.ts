import { listProjectResources, ProjectResourceSearchInput, truncateValue } from "../posthog-client";

type FeatureFlag = {
  id?: number;
  key?: string;
  name?: string;
  active?: boolean;
  created_at?: string;
  rollout_percentage?: number;
  filters?: Record<string, unknown>;
  created_by?: { email?: string; first_name?: string };
};

export default async function tool({
  projectId,
  search,
  limit,
  includeFilters = false,
}: ProjectResourceSearchInput = {}) {
  const { resolvedProjectId, response } = await listProjectResources<FeatureFlag>({
    projectId,
    endpoint: "feature_flags",
    search,
    limit,
    defaultLimit: 50,
    maxLimit: 100,
  });

  return {
    projectId: resolvedProjectId,
    count: response.count,
    next: response.next,
    flags: (response.results ?? []).map((flag) => ({
      id: flag.id,
      key: flag.key,
      name: flag.name,
      active: flag.active,
      rolloutPercentage: flag.rollout_percentage,
      createdAt: flag.created_at,
      createdBy: flag.created_by,
      filters: includeFilters ? truncateValue(flag.filters) : undefined,
    })),
  };
}
