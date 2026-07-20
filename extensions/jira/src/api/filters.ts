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
};

export async function getFilters(query: string) {
  const { sortByFavourite } = getPreferenceValues<Preferences.MyFilters>();
  const maxResults = 100;
  let startAt = 0;
  let hasMore = true;
  const filters: Filter[] = [];

  while (hasMore) {
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

    if (
      result?.isLast === true ||
      values.length < maxResults ||
      (result?.total !== undefined && filters.length >= result.total)
    ) {
      hasMore = false;
    } else {
      startAt += values.length;
    }
  }

  return filters;
}
