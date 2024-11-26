import { open, getPreferenceValues } from "@raycast/api";

const dir = getPreferenceValues<Preferences.Desktop>().desktopdir;

export default function Command() {
  return open(`${dir}`);
}
