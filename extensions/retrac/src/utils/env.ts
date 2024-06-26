import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

export const apiKey = preferences.apiKey;
export const projectSlug = preferences.projectSlug;
