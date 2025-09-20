import { useFetch } from "@raycast/utils";
import type { Data } from "@/types/account";
import { useAuthHeaders } from "./useAuthHeaders";

export function useAccountInfo() {
  const { isLoading, data, revalidate } = useFetch<Data>(`https://api.hubapi.com/account-info/v3/details`, {
    method: "get",
    headers: useAuthHeaders(),
    keepPreviousData: true,
  });

  return { isLoading, data, revalidate };
}
