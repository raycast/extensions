import { getPreferenceValues } from "@raycast/api";

export const getSetArcaneWallpaperPreferences = () => getPreferenceValues<Preferences.SetArcaneWallpaper>();

export const getAutoSwitchArcaneWallpaperPreferences = () =>
  getPreferenceValues<Preferences.AutoSwitchArcaneWallpaper>();
