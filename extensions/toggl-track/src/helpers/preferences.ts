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
