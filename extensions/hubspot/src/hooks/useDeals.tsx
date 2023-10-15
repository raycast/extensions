import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Data } from "../types/deal";

export function useDeals({ search = "" }: { search?: string }) {
  const preferences = getPreferenceValues();
  const accessToken = preferences?.accessToken;

  const { isLoading, data, revalidate } = useFetch<Data>(`https://api.hubapi.com/crm/v3/objects/deals/search`, {
    method: "post",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: search,
      limit: 100,
      properties: ["amount", "closedate", "createdate", "dealname", "dealstage", "pipeline"],
    }),
    keepPreviousData: true,
  });

  return { isLoading, data, revalidate };
}
