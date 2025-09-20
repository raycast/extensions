import { BASE_URL } from "../lib/constants";
import { useFetch } from "@raycast/utils";
import type { Hook } from "../types";

export function useSearch(searchText: string) {
  return useFetch<Hook[]>(`${BASE_URL}/api/hooks?search=${searchText}`, {
    keepPreviousData: true,
  });
}
