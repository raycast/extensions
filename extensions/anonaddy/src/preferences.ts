import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  apiKey: string;
};

const preferences = {
  get apiKey() {
    const preferences = getPreferenceValues<Preferences>();

    return preferences.apiKey;
  },
};

export default preferences;
