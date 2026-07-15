import { getPreferenceValues } from "@raycast/api";

export function buildHeaders() {
  const preferences = getPreferenceValues<Preferences>();
  return {
    Authorization: `PVEAPIToken=${preferences.tokenId}=${preferences.tokenSecret}`,
  };
}
