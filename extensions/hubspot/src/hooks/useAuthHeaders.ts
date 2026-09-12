import { getPreferenceValues } from "@raycast/api";

export function useAuthHeaders() {
  const preferences = getPreferenceValues<Preferences>();
  const accessToken = preferences.accessToken;

  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}
