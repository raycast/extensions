import { getPreferenceValues } from "@raycast/api";

import { request } from "./request";

export type Filter = {
  id: string;
  name: string;
  jql: string;
};

type GetFiltersResponse = {
  values: Filter[];
};

export async function getFilters(query: string) {
  const { sortByFavourite } = getPreferenceValues<Preferences.MyFilters>();

  const params = {
    maxResults: "100",
    expand: "jql",
    filterName: query,
    ...(sortByFavourite === true && { orderBy: "-IS_FAVOURITE" }),
  };

  const result = await request<GetFiltersResponse>(`/filter/search`, { params });
  return result?.values;
}
