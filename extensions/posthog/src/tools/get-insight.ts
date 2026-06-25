import { posthogRequest, truncateValue } from "../posthog-client";
import { requireAccountId, requireProjectId } from "../tool-auth";

type Input = {
  accountId?: string;
  projectId?: number;
  insightId: string;
  includeFilters?: boolean;
  includeResult?: boolean;
};

export default async function tool({
  accountId,
  projectId,
  insightId,
  includeFilters = true,
  includeResult = false,
}: Input) {
  const resolvedAccountId = requireAccountId(accountId);
  const resolvedProjectId = requireProjectId(projectId);
  const insight = await posthogRequest<Record<string, unknown>>(
    resolvedAccountId,
    `projects/${resolvedProjectId}/insights/${insightId}/`,
  );

  return truncateValue({
    accountId: resolvedAccountId,
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
