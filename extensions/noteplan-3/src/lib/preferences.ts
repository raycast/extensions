import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  fileExtension: string;
}

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};
