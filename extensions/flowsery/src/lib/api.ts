import { getPreferenceValues } from "@raycast/api";
import { API_URL, createApi, FlowseryApi } from "./client";

export function api(): FlowseryApi {
  const { apiKey } = getPreferenceValues<Preferences>();
  return createApi({ baseUrl: API_URL, apiKey, userAgent: "flowsery-raycast" });
}
