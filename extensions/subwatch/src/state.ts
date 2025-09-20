import { useFetch } from "@raycast/utils";
import { GetSubscriptionsResponse } from "./types";
import { getPreferenceValues } from "@raycast/api";

export const fetchSubscriptions = () => {
  const { subwatchApiKey, supabaseApiKey } = getPreferenceValues<Preferences>();

  return useFetch<[GetSubscriptionsResponse]>("https://nzyzephaenhlxoohrphc.supabase.co/rest/v1/rpc/raycast_get_data", {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabaseApiKey },
    body: JSON.stringify({ raycast_uuid: subwatchApiKey }),
  });
};
