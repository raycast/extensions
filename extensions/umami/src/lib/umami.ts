import { getPreferenceValues } from "@raycast/api";
import { getClient } from "@umami/api-client";

const PREFERENCES = getPreferenceValues<Preferences>();
export const IS_CLOUD = PREFERENCES.UMAMI_API_CLIENT_ENDPOINT.includes("https://api.umami.is/v1");

export const umami = getClient({
  userId: IS_CLOUD ? undefined : PREFERENCES.UMAMI_API_CLIENT_USER_ID,
  secret: IS_CLOUD ? undefined : PREFERENCES.UMAMI_API_CLIENT_SECRET,
  apiEndpoint: PREFERENCES.UMAMI_API_CLIENT_ENDPOINT,
  apiKey: IS_CLOUD ? PREFERENCES.UMAMI_API_KEY : undefined,
});
