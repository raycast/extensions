import { useFetch } from "@raycast/utils";
import type { Data } from "@/types/deal";
import { useAuthHeaders } from "./useAuthHeaders";

export function useDeals({ search = "" }: { search?: string }) {
  const { isLoading, data, revalidate } = useFetch<Data>(`https://api.hubapi.com/crm/v3/objects/deals/search`, {
    method: "post",
    headers: useAuthHeaders(),
    body: JSON.stringify({
      query: search,
      limit: 100,
      properties: ["amount", "closedate", "createdate", "dealname", "dealstage", "pipeline"],
    }),
    keepPreviousData: true,
  });

  return { isLoading, data, revalidate };
}
