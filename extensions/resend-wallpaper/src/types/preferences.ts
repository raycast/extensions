import { getPreferenceValues } from "@raycast/api";

export const { layout, columns, picturesDirectory } = getPreferenceValues<Preferences.SetResendWallpaper>();

export const { refreshIntervalSeconds } = getPreferenceValues<Preferences.AutoSwitchResendWallpaper>();

export interface DuplicatePreferences {
  applyTo: string;
  respectAppearance: boolean;
}

export const { applyTo, respectAppearance } = getPreferenceValues<DuplicatePreferences>();
