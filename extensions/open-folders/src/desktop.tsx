import { open, getPreferenceValues } from "@raycast/api";

interface Preferences {
  desktopdir: string;
}

export default function Command() {
  const dir = getPreferenceValues<Preferences>().desktopdir;
  return open(`${dir}`);
}
