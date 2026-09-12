import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  token?: string;
}

export default function getPreferences() {
  return getPreferenceValues<Preferences>();
}
