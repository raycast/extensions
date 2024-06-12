import { getPreferenceValues } from "@raycast/api";

export default function getPreferences() {
  return getPreferenceValues<Preferences>();
}
