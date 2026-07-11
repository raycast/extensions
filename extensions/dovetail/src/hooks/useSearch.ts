import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import qs from "qs";
import { useState } from "react";
import { ApiEndpoint, BaseUrl, buildHeaders, EndpointData, PageSize } from "../api/endpoints";
import { useAuth } from "./useAuth";

interface SearchApi<Data> {
  data: Data[];
  isLoading: boolean;
  onQueryChange: (value: string) => void;
  numberOfResults: string;
  pagination: List.Props["pagination"];
}

export function useSearch<Endpoint extends ApiEndpoint>(endpoint: Endpoint): SearchApi<EndpointData<Endpoint>> {
  const { token } = useAuth();
  const [query, setQuery] = useState("");

  const { isLoading, data, pagination } = useFetch(
    ({ cursor }) =>
      BaseUrl +
      endpoint.path +
      `?${qs.stringify({ filter: endpoint.buildFilter(query), page: { start_cursor: cursor, limit: PageSize } })}`,
    {
      headers: buildHeaders(token),
      parseResponse: async (response) => {
        const json = await response.json();
        return endpoint.schema.parse(json);
      },
      mapResult: (result) => ({
        data: result.data,
        hasMore: result.page.has_more,
        cursor: result.page.next_cursor,
      }),
      keepPreviousData: true,
      initialData: [],
    },
  );

  const numberOfResults = data.length === 1 ? "1 result" : `${data.length} results`;

  return {
    data,
    isLoading,
    onQueryChange: setQuery,
    numberOfResults,
    pagination,
  };
}
