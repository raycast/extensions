import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./../models";

export function getAuthHeaders() {
  const { login, password } = getPreferenceValues<Preferences>();

  const headers: Record<string, string> = {
    ...(login && password ? { Authorization: "Basic " + btoa(`${login}:${password}`) } : {}),
  };

  return headers;
}
