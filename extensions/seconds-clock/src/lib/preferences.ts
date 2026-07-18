import { getPreferenceValues } from "@raycast/api";

import type { TimeFormatPreference } from "./time";

type ExtensionPreferences = {
  timeFormat: TimeFormatPreference;
};

export function getTimeFormatPreference(): TimeFormatPreference {
  return getPreferenceValues<ExtensionPreferences>().timeFormat;
}
