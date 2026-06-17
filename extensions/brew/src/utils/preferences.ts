import { getPreferenceValues } from "@raycast/api";

export const preferences = <Preferences & Preferences.CleanUp>getPreferenceValues();
