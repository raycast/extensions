import { getPreferenceValues } from "@raycast/api";

export function getPreferences(): Preferences {
  const preferences = getPreferenceValues<Preferences>();
  return {
    serverUrl: preferences.serverUrl?.trim() || "",
    username: preferences.username?.trim() || undefined,
    password: preferences.password?.trim() || undefined,
    defaultDirectory: preferences.defaultDirectory?.trim() || undefined,
  };
}
