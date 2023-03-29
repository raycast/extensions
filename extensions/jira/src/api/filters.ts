import { request } from "./request";

export type Filter = {
  id: string;
  name: string;
  jql: string;
};

type GetFiltersResponse = {
  values: Filter[];
};

export async function getFilters() {
  const params = { maxResults: "100", expand: "jql" };

  const result = await request<GetFiltersResponse>(`/filter/search`, { params });
  return result?.values;
}
