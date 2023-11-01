import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  showColorfulSignal: boolean;
  showWifiName: boolean;
  showQualityNumber: boolean;
}

export const { showQualityNumber, showWifiName, showColorfulSignal } = getPreferenceValues<Preferences>();
