import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getIsHistoryPaused(): boolean {
  const prefs = getPrefs();
  return prefs.isHistoryPaused ?? false;
}
