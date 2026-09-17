import { getPreferenceValues } from "@raycast/api";

export const getPreferences = (): Preferences =>
  getPreferenceValues<Preferences>();
