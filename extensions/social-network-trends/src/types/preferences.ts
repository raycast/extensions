import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  rememberTag: boolean;
}

export const { rememberTag } = getPreferenceValues<Preferences>();
