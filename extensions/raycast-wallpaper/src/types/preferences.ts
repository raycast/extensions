import { getPreferenceValues } from "@raycast/api";

export const { layout, columns, picturesDirectory } = getPreferenceValues<Preferences.SetRaycastWallpaper>();

export const { refreshIntervalSeconds, respectAppearance } =
  getPreferenceValues<Preferences.AutoSwitchRaycastWallpaper>();

export interface DuplicatePreferences {
  applyTo: string;
}
export const { applyTo } = getPreferenceValues<DuplicatePreferences>();
