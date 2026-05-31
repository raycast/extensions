import { getPreferenceValues } from "@raycast/api";

export const { layout, columns, picturesDirectory } = getPreferenceValues<Preferences.SetArcaneWallpaper>();

export const { refreshIntervalSeconds } = getPreferenceValues<Preferences.AutoSwitchArcaneWallpaper>();

export interface DuplicatePreferences {
  applyTo: string;
}

export const { applyTo } = getPreferenceValues<DuplicatePreferences>();
