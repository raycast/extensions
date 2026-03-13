import { getPreferenceValues } from "@raycast/api";

export const { layout, columns, itemInset } = getPreferenceValues<Preferences.SetAutoQuitApp>();
export const { refreshInterval } = getPreferenceValues<Preferences.AutoQuitAppMenubar>();
