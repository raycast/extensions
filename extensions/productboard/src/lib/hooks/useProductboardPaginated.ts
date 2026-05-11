import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL, DEFAULT_PAGE_LIMIT } from "../constants";
import { ErrorResponse, PageMeta } from "../types";

export default function useProductboardPaginated<T>(endpoint: string) {
  const { isLoading, error, data, pagination, revalidate } = useFetch(
    (options) =>
      API_URL +
      endpoint +
      "?" +
      new URLSearchParams({ pageLimit: String(DEFAULT_PAGE_LIMIT) }).toString() +
      (options.cursor ? `&pageCursor=${options.cursor}` : ""),
    {
      headers: API_HEADERS,
      async parseResponse(response) {
        if (!response.ok) {
          const result = (await response.json()) as ErrorResponse;
          if ("message" in result) throw new Error(result.message);
          if ("error" in result) throw new Error(result.error);
          if ("ok" in result) throw new Error(result.errors[0].source);
          throw new Error(result.errors[0].detail);
        } else {
          const result = (await response.json()) as { data: T[] } & PageMeta;
          return result;
        }
      },
      mapResult(result) {
        const hasMore = "links" in result ? Boolean(result.links.next) : Boolean(result.pageCursor);
        const cursor =
          "links" in result
            ? !result.links.next
              ? undefined
              : new URL(result.links.next).searchParams.get("pageCursor")
            : result.pageCursor;
        return {
          data: result.data,
          hasMore,
          cursor,
        };
      },
      initialData: [],
    },
  );
  return { isLoading, error, data, pagination, revalidate };
}
