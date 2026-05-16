import { api, Paginated } from "./client";

export type Project = {
  id: number;
  name: string;
};

export type ProjectDetail = Project & {
  uuid: string;
  created_at: string;
  updated_at: string;
  is_demo: boolean;
  timezone: string;
  slack_incoming_webhook: string;
  person_display_name_properties: string[];
};

export function listProjects(signal?: AbortSignal) {
  return api.get<Paginated<Project>>("projects", signal);
}

export function getProject(id: number | string, signal?: AbortSignal) {
  return api.get<ProjectDetail>(`projects/${id}`, signal);
}
