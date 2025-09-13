import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  license: string;
}

export const preferences = getPreferenceValues<Preferences>();
