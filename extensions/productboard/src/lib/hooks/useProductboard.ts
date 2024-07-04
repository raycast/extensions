import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL, DEFAULT_PAGE_LIMIT } from "../constants";
import { ErrorResponse, PageMeta } from "../types";

export default function useProductboard<T>(endpoint: string) {
  const { isLoading, error, data, pagination, revalidate } = useFetch(
    (options) =>
      API_URL +
      endpoint +
      "?" +
      new URLSearchParams({ pageLimit: String(DEFAULT_PAGE_LIMIT), pageCursor: options.cursor || "" }).toString(),
    {
      headers: API_HEADERS,
      async parseResponse(response) {
        if (!response.ok) {
          const result = (await response.json()) as ErrorResponse;
          if ("message" in result) throw new Error(result.message);
          if ("error" in result) throw new Error(result.error);
          throw new Error(result.errors[0].source);
        } else {
          const result = (await response.json()) as { data: T[] } & PageMeta;
          return result;
        }
      },
      mapResult(result) {
        return {
          data: result.data,
          hasMore: Boolean(result.pageCursor),
          cursor: result.pageCursor,
        };
      },
      initialData: [],
    },
  );
  return { isLoading, error, data, pagination, revalidate };
}
