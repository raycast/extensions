import { useCachedState, useFetch } from "@raycast/utils";
import { SearchResult } from "@/types";
import { familyStylesByPrefix } from "@/utils/data";
import { iconQuery } from "@/utils/query";

export const useData = (accessToken: string, execute: boolean, query: string, type: string) => {
  const [iconData, setIconData] = useCachedState<SearchResult>("iconData");

  // Fetch icons for a specific family and style based on query
  const { isLoading, data, revalidate } = useFetch<SearchResult>("https://api.fontawesome.com", {
    execute: !!(accessToken && execute),
    keepPreviousData: true,
    method: "POST",
    body: iconQuery(query, familyStylesByPrefix[type]),
    onData: (data) => {
      setIconData(data);
    },
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const filteredData = ((iconData || data)?.data?.search || []).filter((searchItem) => searchItem.svgs.length != 0);

  return { isLoading, data: filteredData, revalidate };
};
