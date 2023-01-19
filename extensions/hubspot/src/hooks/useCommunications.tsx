import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Data } from "../types/communications";

export function useCommunications() {
  const preferences = getPreferenceValues();
  const accessToken = preferences?.accessToken;

  const { isLoading, data, revalidate } = useFetch<Data>(
    `https://api.hubapi.com/crm/v3/objects/communications?limit=20&properties=hs_communication_channel_type&properties=hs_communication_logged_from&archived=false`,
    {
      method: "get",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      keepPreviousData: true,
    }
  );

  return { isLoading, data, revalidate };
}
