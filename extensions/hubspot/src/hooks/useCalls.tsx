import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Data } from "../types/call";

export function useCalls() {
  const preferences = getPreferenceValues();
  const accessToken = preferences?.accessToken;

  const { isLoading, data, revalidate } = useFetch<Data>(
    `https://api.hubapi.com/crm/v3/objects/calls?limit=20&properties=hs_timestamp%2Chs_call_body%2Chs_call_duration%2Chs_call_callee_object_id%2Chs_call_from_number%2Chs_call_recording_url%2Chs_call_to_number%2Chs_call_status%2Chs_call_title%2Chs_call_to_number%2Chs_lastmodifieddate%2Chubspot_owner_id&archived=false`,
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
