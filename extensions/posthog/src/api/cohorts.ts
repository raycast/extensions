import { api, Paginated } from "./client";

export type Cohort = {
  id: number;
  name: string;
  description: string;
  count: number;
  deleted: boolean;
  last_calculation: string;
  created_at: string;
  created_by: { email: string };
};

export function listCohorts(projectId: string | number, signal?: AbortSignal) {
  return api.get<Paginated<Cohort>>(`projects/${projectId}/cohorts`, signal);
}
