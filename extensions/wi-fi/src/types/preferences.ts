import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  showWifiName: boolean;
  showIpAddress: boolean;
}

export const { showWifiName, showIpAddress } = getPreferenceValues<Preferences>();
