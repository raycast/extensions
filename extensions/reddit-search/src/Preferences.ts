import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  resultLimit: number;
}

export default function getPreferences() {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.resultLimit < 1) {
    preferences.resultLimit = 1;
  } else if (preferences.resultLimit > 100) {
    preferences.resultLimit = 100;
  }

  return preferences;
}
