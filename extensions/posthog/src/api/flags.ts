import { api, Paginated } from "./client";

export type FeatureFlag = {
  id: number;
  key: string;
  name?: string;
  active: boolean;
  filters?: Record<string, unknown>;
  deleted?: boolean;
  rollout_percentage?: number | null;
  created_at?: string;
  created_by?: { email: string } | null;
};

export function listFeatureFlags(projectId: string | number, signal?: AbortSignal) {
  return api.get<Paginated<FeatureFlag>>(`projects/${projectId}/feature_flags`, signal);
}

export function getFeatureFlagByKey(projectId: string | number, key: string, signal?: AbortSignal) {
  return api.get<Paginated<FeatureFlag>>(
    `projects/${projectId}/feature_flags?search=${encodeURIComponent(key)}`,
    signal,
  );
}

export function getFeatureFlag(projectId: string | number, id: number, signal?: AbortSignal) {
  return api.get<FeatureFlag>(`projects/${projectId}/feature_flags/${id}`, signal);
}

export function createFeatureFlag(projectId: string | number, body: Partial<FeatureFlag>, signal?: AbortSignal) {
  return api.post<FeatureFlag>(`projects/${projectId}/feature_flags`, body, signal);
}

export function updateFeatureFlag(
  projectId: string | number,
  id: number,
  body: Partial<FeatureFlag>,
  signal?: AbortSignal,
) {
  return api.patch<FeatureFlag>(`projects/${projectId}/feature_flags/${id}`, body, signal);
}

export function deleteFeatureFlag(projectId: string | number, id: number, signal?: AbortSignal) {
  return api.patch<FeatureFlag>(`projects/${projectId}/feature_flags/${id}`, { deleted: true }, signal);
}
