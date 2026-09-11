import { getPreferenceValues } from "@raycast/api";
import { TinkererApiClient } from "./client";

interface ExtensionPreferences {
  authorizationValue: string;
  baseUrl: string;
}

export function getApiClient(): TinkererApiClient {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  return new TinkererApiClient({ apiKey: preferences.authorizationValue, baseUrl: preferences.baseUrl });
}
