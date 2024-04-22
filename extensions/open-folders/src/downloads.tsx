import { open, getPreferenceValues } from "@raycast/api";

interface Preferences {
  downloadsdir: string;
}

export default function Command() {
  const dir = getPreferenceValues<Preferences>().downloadsdir;
  return open(`${dir}`);
}
