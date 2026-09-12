import { getPreferenceValues } from "@raycast/api";

export const { showDomain, recentOnTop, rememberFilterTag, searchEngine } = getPreferenceValues<Preferences.Index>();
