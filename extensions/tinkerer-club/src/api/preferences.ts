import { getPreferenceValues } from "@raycast/api";
import { TinkererApiClient } from "./client";

export function getApiClient(): TinkererApiClient {
  const preferences = getPreferenceValues<Preferences>();
  return new TinkererApiClient({ apiKey: preferences.authorizationValue, baseUrl: preferences.baseUrl });
}
