import { useFetch } from "@raycast/utils";
import { NifResponse } from "../types";

const BASE_URL = "https://nif.rgllm.workers.dev";

export function useFetchNif(query: string) {
  const { isLoading, data, error } = useFetch<NifResponse>(`${BASE_URL}/?q=${encodeURIComponent(query)}`, {
    execute: !!query && query.length >= 9,
  });

  return { isLoading, data, error };
}
