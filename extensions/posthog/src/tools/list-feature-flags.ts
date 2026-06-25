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
  accountId,
  projectId,
  search,
  limit,
  includeFilters = false,
}: ProjectResourceSearchInput = {}) {
  const {
    accountId: resolvedAccountId,
    resolvedProjectId,
    response,
  } = await listProjectResources<FeatureFlag>({
    projectId,
    accountId,
    endpoint: "feature_flags",
    search,
    limit,
    defaultLimit: 50,
    maxLimit: 100,
  });

  return {
    accountId: resolvedAccountId,
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
