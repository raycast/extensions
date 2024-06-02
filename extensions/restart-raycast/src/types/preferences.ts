import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  isAutoRestart: boolean;
}

export const { isAutoRestart } = getPreferenceValues<Preferences>();
