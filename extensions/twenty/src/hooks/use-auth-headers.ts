import { getPreferenceValues } from "@raycast/api";

export function useAuthHeaders() {
  const preferences = getPreferenceValues<Preferences>();
  const accessToken = preferences.token;

  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}
