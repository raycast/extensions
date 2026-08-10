import { listProjectResources, ProjectResourceSearchInput, truncateValue } from "../posthog-client";

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

export default async function tool({
  projectId,
  search,
  limit,
  includeFilters = false,
}: ProjectResourceSearchInput = {}) {
  const { resolvedProjectId, response } = await listProjectResources<Insight>({
    projectId,
    endpoint: "insights",
    search,
    limit,
    defaultLimit: 25,
    maxLimit: 100,
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
