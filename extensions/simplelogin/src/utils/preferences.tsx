import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  api_token: string;
  app_url: string;
  mode: string;
}

export default function load_preferences() {
  const preferences = getPreferenceValues<Preferences>();
  return preferences;
}
