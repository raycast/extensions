import { open, getPreferenceValues } from "@raycast/api";

export default function Command() {
  return open(getPreferenceValues<Preferences.Downloads>().downloadsdir);
}
