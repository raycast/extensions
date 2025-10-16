import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  apikey: string;
  layout: string;
  columns: string;
  mediaColumns: string;
  applyTo: string;
  downloadSize: string;
  downloadDirectory: string;
  rememberTag: boolean;
}

export const { apikey, layout, columns, mediaColumns, applyTo, downloadSize, downloadDirectory, rememberTag } =
  getPreferenceValues<Preferences>();
