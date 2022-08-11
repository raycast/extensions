import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  newBlankTabURL: string;
  /**
   * The URL used for search.
   */
  newTabURL: string;
}

export default function getPrefs() {
  return getPreferenceValues<Preferences>();
}
