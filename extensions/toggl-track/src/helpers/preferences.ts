import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();
export const togglApiToken = preferences.togglApiToken;
export const hideArchivedProjects = preferences.hideArchivedProjects;

interface Preferences {
  togglApiToken: string;
  hideArchivedProjects: boolean;
}
