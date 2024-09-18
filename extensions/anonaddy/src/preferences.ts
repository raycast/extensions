import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

const preferences = {
  get apiKey() {
    const preferences = getPreferenceValues<Preferences>();

    return preferences.apiKey;
  },
};

export default preferences;
