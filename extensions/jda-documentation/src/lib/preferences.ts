import { getPreferenceValues } from "@raycast/api";

export type PrimaryAction = Preferences["primaryAction"];
export type JdaVariable = Preferences["jdaVariable"];

export function getPreferences(): Preferences {
  const preferences = getPreferenceValues<Preferences>();
  return {
    ...preferences,
    applicationId: preferences.applicationId?.trim() ?? "",
  };
}
