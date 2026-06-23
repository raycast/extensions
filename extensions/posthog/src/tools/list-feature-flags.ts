import { clampLimit, getDefaultProjectId, posthogRequest, truncateValue } from "../posthog-client";

type Input = {
  projectId?: number;
  search?: string;
  limit?: number;
  includeFilters?: boolean;
};

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

type FeatureFlagsResponse = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: FeatureFlag[];
};

export default async function tool({ projectId, search, limit, includeFilters = false }: Input = {}) {
  const resolvedProjectId = getDefaultProjectId(projectId);
  const response = await posthogRequest<FeatureFlagsResponse>(`projects/${resolvedProjectId}/feature_flags/`, {
    query: {
      search,
      limit: clampLimit(limit, 50, 100),
    },
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
