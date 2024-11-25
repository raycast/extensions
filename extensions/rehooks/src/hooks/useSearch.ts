import { useFetch } from "@raycast/utils";
import type { Hook } from "../types";

export function useSearch(searchText: string) {
  return useFetch<Hook[]>(`https://rehooks.pyr33x.ir/api/hooks?search=${searchText}`, {
    keepPreviousData: true,
  });
}
