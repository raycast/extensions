import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  directories: string;
}

export default function getPreferences() {
  return getPreferenceValues<Preferences>();
}
