import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiToken: string;
  defaultTaskId: string;
  defaultProjectId: string;
}

export function getSettings(): Preferences {
  return getPreferenceValues<Preferences>();
}
