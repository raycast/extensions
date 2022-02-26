import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  newTabURL: string;
  shouldShowNewTabInBookmarks: boolean;
}

export default function getPrefs() {
  return getPreferenceValues<Preferences>();
}
