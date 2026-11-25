import { getPreferenceValues } from "@raycast/api";
import { AdaptlyPostApi, API_URL, createApi } from "./client";

export function api(): AdaptlyPostApi {
  const { apiKey } = getPreferenceValues<Preferences>();
  return createApi({ baseUrl: API_URL, apiKey, userAgent: "adaptlypost-raycast" });
}
