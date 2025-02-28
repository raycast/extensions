import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  geminiApiKey: string;
};

export function getPreferenceByValue(preference: keyof Preferences) {
  return getPreferenceValues<Preferences>()[preference];
}
