import { api, Paginated } from "./client";

export type Person = {
  id: number;
  name: string;
  distinct_ids: string[];
};

export function searchPersons(projectId: string | number, term: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ search: term });
  return api.get<Paginated<Person>>(`projects/${projectId}/persons?${query.toString()}`, signal);
}
