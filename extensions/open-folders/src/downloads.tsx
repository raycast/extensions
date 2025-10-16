import { open, getPreferenceValues } from "@raycast/api";

const dir = getPreferenceValues<Preferences.Downloads>().downloadsdir;

export default function Command() {
  return open(`${dir}`);
}
