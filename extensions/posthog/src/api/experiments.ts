import { api, Paginated } from "./client";

export type Experiment = {
  id: number;
  name: string;
  description: string;
  feature_flag_key: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  archived: boolean;
  type: "product" | "web";
  parameters: Record<string, unknown>;
  filters: Record<string, unknown>;
  metrics?: unknown[];
  metrics_secondary?: unknown[];
  exposure_cohort?: number | null;
  created_by: { email: string } | null;
};

export function listExperiments(projectId: string | number, signal?: AbortSignal) {
  return api.get<Paginated<Experiment>>(`projects/${projectId}/experiments`, signal);
}

export function getExperiment(projectId: string | number, id: number | string, signal?: AbortSignal) {
  return api.get<Experiment>(`projects/${projectId}/experiments/${id}`, signal);
}

export function updateExperiment(
  projectId: string | number,
  id: number | string,
  body: Partial<Experiment> & { archived?: boolean },
  signal?: AbortSignal,
) {
  return api.patch<Experiment>(`projects/${projectId}/experiments/${id}`, body, signal);
}

export function createExperiment(projectId: string | number, body: Partial<Experiment>, signal?: AbortSignal) {
  return api.post<Experiment>(`projects/${projectId}/experiments`, body, signal);
}

export function deleteExperiment(projectId: string | number, id: number | string, signal?: AbortSignal) {
  return api.delete<void>(`projects/${projectId}/experiments/${id}`, signal);
}

export function getExperimentResults(projectId: string | number, id: number | string, signal?: AbortSignal) {
  return api.get<Record<string, unknown>>(`projects/${projectId}/experiments/${id}/results`, signal);
}
