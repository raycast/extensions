import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "../constants";
import { Meta } from "../types";

export default function useVultrPaginated<T>(endpoint: string) {
  type Result = {
    [key: string]: T[];
  } & {
    meta: Meta;
  };

  const { isLoading, data, pagination, revalidate } = useFetch(
    (options) => API_URL + endpoint + (options.cursor ? `?cursor=${options.cursor}` : ""),
    {
      headers: API_HEADERS,
      mapResult(result: Result) {
        const key = Object.keys(result).find((k) => k !== "meta");
        return {
          data: result[key as keyof typeof result] as T[],
          hasMore: result.meta.links.next !== "",
          cursor: result.meta.links.next,
        };
      },
      initialData: [],
    },
  );

  return { isLoading, data, pagination, revalidate };
}
