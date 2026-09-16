import { getPreferenceValues } from "@raycast/api";

export type DocsVersion = Preferences["docsVersion"];
export type PrimaryAction = Preferences["primaryAction"];
export type BotVariable = Preferences["botVariable"];

export function getPreferences(): Preferences {
  const preferences = getPreferenceValues<Preferences>();
  return { ...preferences, applicationId: preferences.applicationId.trim() };
}
