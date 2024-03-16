import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();
export const togglApiToken = preferences.togglApiToken;

interface Preferences {
  togglApiToken: string;
}
