import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  apiKey: string;
};

export function getPreferences() {
  return getPreferenceValues<Preferences>();
}
