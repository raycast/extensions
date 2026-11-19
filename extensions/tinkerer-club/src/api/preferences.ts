import { getPreferenceValues } from "@raycast/api";
import { TinkererApiClient } from "./client";
import { demoFetch } from "./demo";

export function getApiClient(): TinkererApiClient {
  const preferences = getPreferenceValues<Preferences>();
  return new TinkererApiClient(
    {
      apiKey: preferences.demoMode ? "demo-only" : (preferences.authorizationValue ?? ""),
      baseUrl: preferences.baseUrl,
    },
    preferences.demoMode ? demoFetch : fetch,
  );
}
