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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    maxDecimals: parseInt(preferences.maxDecimals as any) || undefined,
  };
}
