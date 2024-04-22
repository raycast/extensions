import { open, getPreferenceValues } from "@raycast/api";

interface Preferences {
  documentsdir: string;
}

export default function Command() {
  const dir = getPreferenceValues<Preferences>().documentsdir;
  return open(`${dir}`);
}
