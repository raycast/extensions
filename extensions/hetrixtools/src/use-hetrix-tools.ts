import { showFailureToast, useFetch } from "@raycast/utils";
import { API_KEY, API_URL, DEFAULT_PER_PAGE } from "./config";
import { ErrorResponse, SuccessResponse } from "./types";

export default function useHetrixTools<T>(endpoint: string) {
  const { isLoading, data, pagination } = useFetch(
    (options) =>
      API_URL +
      endpoint +
      "?" +
      new URLSearchParams({ per_page: DEFAULT_PER_PAGE, page: String(options.page + 1) }).toString(),
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      async parseResponse(response) {
        if (!response.ok) {
          const result = (await response.json()) as ErrorResponse;
          throw new Error(result.message, { cause: result.status });
        }
        const result = (await response.json()) as SuccessResponse<T>;
        return result;
      },
      mapResult(result) {
        const key = Object.keys(result).find((k) => k !== "meta");
        const data = result[key as keyof typeof result];
        return {
          data,
          hasMore: !!result.meta.pagination.next,
        };
      },
      async onError(error) {
        await showFailureToast(error.message, {
          title: String(error.cause) || "Something went wrong",
        });
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return { isLoading, data, pagination };
}
