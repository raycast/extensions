import { getPreferenceValues } from "@raycast/api";

export interface Preference {
  autoOpen: boolean;
  quitWhenNoWindows: boolean;
  showMenubarTitle: boolean;
  showAsMarkdown: boolean;
  showDetailMetadata: boolean;
  primaryAction: string;
}

export const { autoOpen, quitWhenNoWindows, showMenubarTitle, showAsMarkdown, showDetailMetadata, primaryAction } =
  getPreferenceValues<Preference>();
