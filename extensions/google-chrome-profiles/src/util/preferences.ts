import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  newTabURL: string;
}

export default function getPrefs() {
  return getPreferenceValues<Preferences>();
}
