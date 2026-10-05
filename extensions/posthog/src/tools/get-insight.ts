import { getDefaultProjectId, posthogRequest, truncateValue } from "../posthog-client";

type Input = {
  projectId?: number;
  insightId: string;
  includeFilters?: boolean;
  includeResult?: boolean;
};

export default async function tool({ projectId, insightId, includeFilters = true, includeResult = false }: Input) {
  const resolvedProjectId = getDefaultProjectId(projectId);
  const insight = await posthogRequest<Record<string, unknown>>(`projects/${resolvedProjectId}/insights/${insightId}/`);

  return truncateValue({
    projectId: resolvedProjectId,
    id: insight.id,
    shortId: insight.short_id,
    name: insight.name,
    description: insight.description,
    saved: insight.saved,
    tags: insight.tags,
    createdAt: insight.created_at,
    lastRefresh: insight.last_refresh,
    filters: includeFilters ? insight.filters : undefined,
    result: includeResult ? insight.result : undefined,
  });
}
