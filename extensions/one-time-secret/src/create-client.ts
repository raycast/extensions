import { getPreferenceValues } from "@raycast/api";
import { OneTimeSecretClient, type OneTimeSecretCredentials, type RegionCode } from "./one-time-secret-client";
import { DEFAULT_REGION } from "./constants";

export function createClientFromPreferences(): OneTimeSecretClient {
  const prefs = getPreferenceValues<Preferences>();
  const region = (prefs.region ?? DEFAULT_REGION) as RegionCode;
  const username = prefs.username?.trim() ?? "";
  const apiToken = prefs.apiToken?.trim() ?? "";
  const credentials: OneTimeSecretCredentials | null =
    username.length > 0 && apiToken.length > 0 ? { username, apiToken } : null;
  return OneTimeSecretClient.fromRegion(region, credentials);
}
