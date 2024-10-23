import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  showNotification: boolean;
}

export const { showNotification } = getPreferenceValues<Preferences>();
