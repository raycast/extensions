import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "../constants";
import { ErrorResponse, PaginatedResponse } from "../types";

export default function useProductboardPaginated<T>(endpoint: string, query?: Record<string, string>) {
  const { isLoading, error, data, pagination, revalidate } = useFetch(
    (options) =>
      API_URL +
      endpoint +
      "?" +
      new URLSearchParams({ ...query, ...(options.cursor ? { pageCursor: options.cursor } : {}) }).toString(),
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
          const result = (await response.json()) as PaginatedResponse<T>;
          return result;
        }
      },
      mapResult(result) {
        const hasMore = Boolean(result.links.next);
        const cursor = result.links.next
          ? new URL(result.links.next).searchParams.get("pageCursor") || undefined
          : undefined;
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
