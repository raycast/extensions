import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  layout: string;
  columns: string;
  applyTo: string;
  downloadSize: string;
  downloadDirectory: string;
  autoDownload: boolean;
  includeDownloadedWallpapers: boolean;
}
export const { layout, columns, applyTo, downloadSize, downloadDirectory, autoDownload, includeDownloadedWallpapers } =
  getPreferenceValues<Preferences>();
