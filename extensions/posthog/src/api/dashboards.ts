import { api, Paginated } from "./client";

export type Dashboard = {
  id: number;
  name: string;
  description: string;
  pinned: boolean;
  is_shared: boolean;
  deleted: boolean;
  created_at: string;
  created_by: { email: string } | null;
  tiles?: Array<{ id: number; insight?: { id: number; short_id?: string; name?: string | null } | null }>;
};

export function listDashboards(projectId: string | number, signal?: AbortSignal) {
  return api.get<Paginated<Dashboard>>(`projects/${projectId}/dashboards`, signal);
}

export function getDashboard(projectId: string | number, id: number, signal?: AbortSignal) {
  return api.get<Dashboard>(`projects/${projectId}/dashboards/${id}`, signal);
}

export function createDashboard(projectId: string | number, body: Partial<Dashboard>, signal?: AbortSignal) {
  return api.post<Dashboard>(`projects/${projectId}/dashboards`, body, signal);
}

export function updateDashboard(
  projectId: string | number,
  id: number,
  body: Partial<Dashboard>,
  signal?: AbortSignal,
) {
  return api.patch<Dashboard>(`projects/${projectId}/dashboards/${id}`, body, signal);
}

export function deleteDashboard(projectId: string | number, id: number, signal?: AbortSignal) {
  return api.patch<Dashboard>(`projects/${projectId}/dashboards/${id}`, { deleted: true }, signal);
}

export function addInsightToDashboard(
  projectId: string | number,
  dashboardId: number,
  insightId: number,
  signal?: AbortSignal,
) {
  return api.post<{ id: number }>(
    `projects/${projectId}/dashboards/${dashboardId}/tiles`,
    { insight: { id: insightId } },
    signal,
  );
}
