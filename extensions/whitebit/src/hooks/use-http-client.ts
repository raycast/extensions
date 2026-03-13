import { getPreferenceValues } from "@raycast/api";
import { HttpClient } from "../api/httpClient";

export function useHttpClient() {
  const preferences = getPreferenceValues<Preferences>();

  return new HttpClient(preferences.token, preferences.secret);
}
