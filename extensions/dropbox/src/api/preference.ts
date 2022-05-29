import { getPreferenceValues } from "@raycast/api";

export interface Preference {
  dropbox_access_token: string;
}

export function getPreference(): Preference {
  return getPreferenceValues<Preference>();
}
