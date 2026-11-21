import { getPreferenceValues } from "@raycast/api";

import { request } from "./request";

export type Filter = {
  id: string;
  name: string;
  jql: string;
};

type GetFiltersResponse = {
  values: Filter[];
  isLast?: boolean;
  total?: number;
  maxResults?: number;
};

export async function getFilters(query: string) {
  const { sortByFavourite } = getPreferenceValues<Preferences.MyFilters>();
  const maxResults = 100;
  let startAt = 0;
  const filters: Filter[] = [];

  while (true) {
    const params = {
      maxResults: String(maxResults),
      startAt: String(startAt),
      expand: "jql",
      filterName: query,
      ...(sortByFavourite === true && { orderBy: "-IS_FAVOURITE" }),
    };

    const result = await request<GetFiltersResponse>(`/filter/search`, { params });
    const values = result?.values ?? [];
    filters.push(...values);
    startAt += values.length;

    if (
      values.length === 0 ||
      result?.isLast === true ||
      (result?.total !== undefined && startAt >= result.total) ||
      (result?.isLast === undefined &&
        result?.total === undefined &&
        values.length < (result?.maxResults ?? maxResults))
    ) {
      return filters;
    }
  }
}
