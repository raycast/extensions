import { getPreferenceValues } from "@raycast/api";

export const newTabPreferences = getPreferenceValues<Preferences.NewTab>();
export const searchArcPreferences = getPreferenceValues<Preferences.Search>();
export const newLittleArcPreferences = getPreferenceValues<Preferences.NewLittleArc>();
export const NewIncognitoWindowPreferences = getPreferenceValues<Preferences.NewIncognitoWindow>();
