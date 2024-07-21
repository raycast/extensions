import { getPreferenceValues } from "@raycast/api";

export const newTabPreferences = getPreferenceValues<Preferences.NewTab>();
export const searchArcPreferences = getPreferenceValues<Preferences.SearchArc>();
export const newLittleArcPreferences = getPreferenceValues<Preferences.NewLittleArc>();
