import { open, getPreferenceValues } from "@raycast/api";

const dir = getPreferenceValues<Preferences.Documents>().documentsdir;

export default function Command() {
  return open(`${dir}`);
}
