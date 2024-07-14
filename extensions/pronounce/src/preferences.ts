import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  language: string;
  isAlwaysSlow?: boolean;
}

export const preferences = getPreferenceValues<Preferences>();
