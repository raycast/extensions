import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  ncfaToken: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
