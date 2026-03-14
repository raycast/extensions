import { getPreferenceValues } from "@raycast/api";

export type ExtensionPreferences = {
  serverUrl: string;
  username?: string;
  password?: string;
  defaultDirectory?: string;
};

export function getPreferences(): ExtensionPreferences {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  return {
    serverUrl: preferences.serverUrl?.trim() || "",
    username: preferences.username?.trim() || undefined,
    password: preferences.password?.trim() || undefined,
    defaultDirectory: preferences.defaultDirectory?.trim() || undefined,
  };
}
