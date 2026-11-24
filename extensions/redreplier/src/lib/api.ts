import { getPreferenceValues } from "@raycast/api";
import { API_URL, createApi, RedReplierApi } from "./client";

export function api(): RedReplierApi {
  const { apiKey } = getPreferenceValues<Preferences>();
  return createApi({ baseUrl: API_URL, apiKey, userAgent: "redreplier-raycast" });
}
