import { getPreferenceValues } from "@raycast/api";

import type { TimeFormatPreference } from "./time";

export function getTimeFormatPreference(): TimeFormatPreference {
  return getPreferenceValues<Preferences>().timeFormat as TimeFormatPreference;
}
