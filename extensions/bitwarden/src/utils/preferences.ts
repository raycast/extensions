import { getPreferenceValues, PreferenceValues } from "@raycast/api";

export function getServerUrlPreference(): string {
  const { serverUrl } = getPreferenceValues<PreferenceValues>();
  if (serverUrl === "" || serverUrl === "bitwarden.com" || serverUrl === "https://bitwarden.com") {
    return "";
  }
  return serverUrl;
}
