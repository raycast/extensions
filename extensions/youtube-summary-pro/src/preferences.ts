import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  history: string;
}

export const preferences = getPreferenceValues<Preferences>();
