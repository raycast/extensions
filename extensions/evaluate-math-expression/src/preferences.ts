import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  maxDecimals?: number;
  replaceSelection: boolean;
  copyToClipboard: boolean;
  displayResult: boolean;
}

export function loadPreferences() {
  const preferences = getPreferenceValues<Preferences>();

  return {
    ...preferences,
    maxDecimals: Number(preferences.maxDecimals) || undefined,
  };
}
