import { useFetch } from "@raycast/utils";
import type { Data } from "@/types/communications";
import { useAuthHeaders } from "./useAuthHeaders";

export function useCommunications() {
  const { isLoading, data, revalidate } = useFetch<Data>(
    `https://api.hubapi.com/crm/v3/objects/communications?limit=20&properties=hs_communication_channel_type&properties=hs_communication_logged_from&archived=false`,
    {
      method: "get",
      headers: useAuthHeaders(),
      keepPreviousData: true,
    },
  );

  return { isLoading, data, revalidate };
}
