import { getPreferenceValues } from "@raycast/api";

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};
