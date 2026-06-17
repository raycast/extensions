import { getPreferenceValues } from "@raycast/api";

export const { layout, columns, applyTo, downloadSize, downloadDirectory, autoDownload, includeDownloadedWallpapers } =
  getPreferenceValues<Preferences>();

export const { refreshInterval } = getPreferenceValues<Preferences.AutoRandomBingWallpaper>();
