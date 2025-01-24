import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  capmoApiToken: string; // Capmo API token
  excludedProjects: string; // Comma-separated list of excluded project IDs
}

export const prefs = getPreferenceValues<Preferences>();
