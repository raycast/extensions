import { getPreferenceValues } from "@raycast/api";

export const { showDomain, rememberFilterTag, searchEngine } = getPreferenceValues<Preferences.Index>();
