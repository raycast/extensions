import { getPreferenceValues } from "@raycast/api";

export const extensionPreferences: Preferences = getPreferenceValues();
export const organizeColorsCommandPreferences: Preferences.OrganizeColors = getPreferenceValues();
