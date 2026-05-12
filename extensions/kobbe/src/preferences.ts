import { getPreferenceValues } from "@raycast/api";

import type { TimeRange } from "./types";

type Preferences = {
  apiToken: string;
  baseUrl: string;
  defaultRange: TimeRange;
};

export function getKobbePreferences(): Preferences {
  const preferences = getPreferenceValues<Preferences>();
  const baseUrl = preferences.baseUrl.trim().replace(/\/+$/, "");

  return {
    apiToken: preferences.apiToken.trim(),
    baseUrl: baseUrl || "https://app.kobbe.io",
    defaultRange: preferences.defaultRange || "7d",
  };
}
