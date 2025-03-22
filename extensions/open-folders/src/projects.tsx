import { open, getPreferenceValues } from "@raycast/api";

const dir = getPreferenceValues<Preferences.Projects>().projectsdir;

export default function Command() {
  return open(`${dir}`);
}
