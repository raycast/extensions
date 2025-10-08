import { useFetch } from "@raycast/utils";
import type { Data } from "@/types/owner";
import { useAuthHeaders } from "./useAuthHeaders";

export function useOwners() {
  const { isLoading, data, revalidate } = useFetch<Data>(`https://api.hubapi.com/crm/v3/owners`, {
    method: "get",
    headers: useAuthHeaders(),
    keepPreviousData: true,
  });

  return { isLoading, data, revalidate };
}
