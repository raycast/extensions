import { api, Paginated } from "./client";

export type Survey = {
  id: string;
  name: string;
  description: string;
  type: "popover" | "button" | "api" | "widget";
  questions: Array<{ type: string; question: string; description?: string }>;
  conditions: Record<string, unknown> | null;
  start_date: string | null;
  end_date: string | null;
  archived: boolean;
  created_at: string;
  created_by: { email: string } | null;
};

export function listSurveys(projectId: string | number, signal?: AbortSignal) {
  return api.get<Paginated<Survey>>(`projects/${projectId}/surveys`, signal);
}

export function getSurvey(projectId: string | number, id: string, signal?: AbortSignal) {
  return api.get<Survey>(`projects/${projectId}/surveys/${id}`, signal);
}

export function createSurvey(projectId: string | number, body: Partial<Survey>, signal?: AbortSignal) {
  return api.post<Survey>(`projects/${projectId}/surveys`, body, signal);
}

export function updateSurvey(projectId: string | number, id: string, body: Partial<Survey>, signal?: AbortSignal) {
  return api.patch<Survey>(`projects/${projectId}/surveys/${id}`, body, signal);
}

export function deleteSurvey(projectId: string | number, id: string, signal?: AbortSignal) {
  return api.delete<void>(`projects/${projectId}/surveys/${id}`, signal);
}

export function getSurveyStats(projectId: string | number, id: string, signal?: AbortSignal) {
  return api.get<Record<string, unknown>>(`projects/${projectId}/surveys/${id}/stats`, signal);
}

export function getSurveysGlobalStats(projectId: string | number, signal?: AbortSignal) {
  return api.get<Record<string, unknown>>(`projects/${projectId}/surveys/stats`, signal);
}
