import { useFetch } from "@raycast/utils";
import { getSheets } from "../utils";
import { GITHUB_API_URL, GITHUB_CONFIG } from "../constants";
import type { ListResponse } from "../types";

export function useListFiles() {
  const url = `${GITHUB_API_URL}/git/trees/${GITHUB_CONFIG.BRANCH}`;

  const { isLoading, data, error } = useFetch(url, {
    mapResult(result: ListResponse) {
      return {
        data: getSheets(result.tree),
      };
    },
  });

  return {
    isLoading,
    data: data ?? [],
    error,
  };
}
