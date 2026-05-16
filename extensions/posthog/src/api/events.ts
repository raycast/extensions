import { api, Paginated } from "./client";

export type EventDefinition = {
  id: string;
  name: string;
  description?: string | null;
  volume_30_day?: number | null;
  query_usage_30_day?: number | null;
  last_seen_at?: string | null;
  created_at?: string;
};

export type PropertyDefinition = {
  id: string;
  name: string;
  property_type?: string | null;
  is_numerical?: boolean;
};

export function listEventDefinitions(
  projectId: string | number,
  params?: { search?: string; limit?: number },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return api.get<Paginated<EventDefinition>>(`projects/${projectId}/event_definitions${qs ? `?${qs}` : ""}`, signal);
}

export function listPropertyDefinitions(
  projectId: string | number,
  params?: { search?: string; type?: "event" | "person"; limit?: number },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.type) query.set("type", params.type);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return api.get<Paginated<PropertyDefinition>>(
    `projects/${projectId}/property_definitions${qs ? `?${qs}` : ""}`,
    signal,
  );
}
