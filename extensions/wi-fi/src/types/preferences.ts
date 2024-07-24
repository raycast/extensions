import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  showWifiName: boolean;
}

export const { showWifiName } = getPreferenceValues<Preferences>();
