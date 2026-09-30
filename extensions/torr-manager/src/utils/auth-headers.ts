import { getPreferenceValues } from "@raycast/api";
import { BasePreferences } from "./../models";

export function getAuthHeaders() {
  const { login, password } = getPreferenceValues<BasePreferences>();

  const headers: Record<string, string> = {
    ...(login && password ? { Authorization: "Basic " + btoa(`${login}:${password}`) } : {}),
  };

  return headers;
}
