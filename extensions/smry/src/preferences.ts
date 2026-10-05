import { getPreferenceValues } from "@raycast/api";
import type { SaveDestination } from "./smry";

type RawPreferences = {
  apiKey: string;
  defaultSaveStatus?: string;
};

export type SmryPreferences = {
  apiKey: string;
  defaultSaveStatus: SaveDestination;
};

export function getSmryPreferences(): SmryPreferences {
  const preferences = getPreferenceValues<RawPreferences>();
  return {
    apiKey: preferences.apiKey.trim(),
    defaultSaveStatus: preferences.defaultSaveStatus === "inbox" ? "inbox" : "later",
  };
}
