import { getPreferenceValues } from "@raycast/api";

export type Preferences = Omit<Preferences.EvaluateMathExpression, "maxDecimals"> & {
  maxDecimals?: number;
};

export function loadPreferences() {
  const preferences = getPreferenceValues<Preferences>();

  return {
    ...preferences,
    maxDecimals: Number(preferences.maxDecimals) || undefined,
  };
}
