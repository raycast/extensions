import { clampLimit, getDefaultProjectId, posthogRequest, truncateValue } from "../posthog-client";

type Input = {
  projectId?: number;
  search?: string;
  limit?: number;
  includeFilters?: boolean;
};

type Insight = {
  id?: number;
  short_id?: string;
  name?: string;
  description?: string;
  saved?: boolean;
  tags?: string[];
  created_at?: string;
  last_refresh?: string;
  filters?: Record<string, unknown>;
  created_by?: { email?: string; first_name?: string };
};

type InsightsResponse = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: Insight[];
};

export default async function tool({ projectId, search, limit, includeFilters = false }: Input = {}) {
  const resolvedProjectId = getDefaultProjectId(projectId);
  const response = await posthogRequest<InsightsResponse>(`projects/${resolvedProjectId}/insights/`, {
    query: {
      search,
      limit: clampLimit(limit, 25, 100),
    },
  });

  return {
    projectId: resolvedProjectId,
    count: response.count,
    next: response.next,
    insights: (response.results ?? []).map((insight) => ({
      id: insight.id,
      shortId: insight.short_id,
      name: insight.name,
      description: insight.description,
      saved: insight.saved,
      tags: insight.tags,
      createdAt: insight.created_at,
      lastRefresh: insight.last_refresh,
      createdBy: insight.created_by,
      filters: includeFilters ? truncateValue(insight.filters) : undefined,
    })),
  };
}
