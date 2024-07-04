import { getPreferenceValues } from "@raycast/api";

export interface Preference {
  autoOpen: boolean;
  quitWhenNoWindows: boolean;
}

export const { autoOpen, quitWhenNoWindows } = getPreferenceValues<Preference>();
