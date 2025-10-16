import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  layout: string;
  columns: string;
  itemInset: string;
  showOpenFolders: boolean;
  rememberTag: boolean;
  primaryAction: string;
  fileShowNumber: string;
  sortBy: string;
}

export const { layout, columns, itemInset, showOpenFolders, rememberTag, primaryAction, fileShowNumber } =
  getPreferenceValues<Preferences>();
