import { getPreferenceValues } from "@raycast/api";

export const { layout, columns, picturesDirectory } = getPreferenceValues<Preferences.SetRaycastWallpaper>();

export const { refreshIntervalSeconds } = getPreferenceValues<Preferences.AutoSwitchRaycastWallpaper>();

export interface DuplicatePreferences {
  applyTo: string;
  respectAppearance: boolean;
}

export const { applyTo, respectAppearance } = getPreferenceValues<DuplicatePreferences>();
