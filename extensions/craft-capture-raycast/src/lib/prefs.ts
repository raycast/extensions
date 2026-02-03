import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  capabilityUrl: string;
  appendPosition?: "start" | "end";
  timeFormat?: string;
  addTimestamp?: boolean;
};

export type ResolvedPreferences = {
  capabilityUrl: string;
  appendPosition: "start" | "end";
  timeFormat: string;
  addTimestamp: boolean;
};

export function getPrefs(): ResolvedPreferences {
  const prefs = getPreferenceValues<Preferences>();
  return {
    capabilityUrl: prefs.capabilityUrl,
    appendPosition: prefs.appendPosition ?? "end",
    timeFormat: prefs.timeFormat ?? "hh:mm a",
    addTimestamp: prefs.addTimestamp ?? false,
  };
}
