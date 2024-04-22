import { open, getPreferenceValues } from "@raycast/api";

interface Preferences {
  projectsdir: string;
}

export default function Command() {
  const dir = getPreferenceValues<Preferences>().projectsdir;
  return open(`${dir}`);
}
