import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<ExtensionPreferences>();
export const {
  togglApiToken,
  showClientsInForm,
  showProjectsInForm,
  showTasksInForm,
  showTagsInForm,
  timeEntriesLookbackDays,
} = preferences;

const cacheTtlParsed = parseInt(preferences.cacheTtl ?? "0");

export const cacheTtl = isNaN(cacheTtlParsed) || cacheTtlParsed < 0 ? 0 : cacheTtlParsed;
