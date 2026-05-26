import { getPreferenceValues } from "@raycast/api";

export type AppPreferences = Preferences;

export function getExtensionPreferences(): AppPreferences {
  const preferences = getPreferenceValues<Preferences>();

  return {
    ...preferences,
    shellPath: preferences.shellPath.trim() || "/bin/zsh",
  };
}
