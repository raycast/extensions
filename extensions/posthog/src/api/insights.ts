import { api, Paginated } from "./client";

export type Insight = {
  id: number;
  short_id: string;
  name: string | null;
  derived_name: string | null;
  description: string;
  filters: Record<string, unknown>;
  query: Record<string, unknown> | null;
  saved: boolean;
  favorited: boolean;
  deleted: boolean;
  created_at: string;
  last_modified_at: string;
  created_by: { email: string } | null;
};

export function listInsights(projectId: string | number, params?: { search?: string }, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  return api.get<Paginated<Insight>>(`projects/${projectId}/insights${qs ? `?${qs}` : ""}`, signal);
}

export function getInsight(projectId: string | number, insightId: number | string, signal?: AbortSignal) {
  return api.get<Insight>(`projects/${projectId}/insights/${insightId}`, signal);
}

export function deleteInsight(projectId: string | number, insightId: number | string, signal?: AbortSignal) {
  return api.delete<void>(`projects/${projectId}/insights/${insightId}`, signal);
}

export function updateInsight(
  projectId: string | number,
  insightId: number | string,
  body: Partial<Pick<Insight, "name" | "description" | "filters" | "query" | "favorited" | "deleted">>,
  signal?: AbortSignal,
) {
  return api.patch<Insight>(`projects/${projectId}/insights/${insightId}`, body, signal);
}

export function createInsight(
  projectId: string | number,
  body: Partial<Insight> & { query?: Record<string, unknown> },
  signal?: AbortSignal,
) {
  return api.post<Insight>(`projects/${projectId}/insights`, body, signal);
}
