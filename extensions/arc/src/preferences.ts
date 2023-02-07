import { getPreferenceValues } from "@raycast/api";
import { NewTabPreferences, SearchArcPreferences } from "./types";

export const newTabPreferences = getPreferenceValues<NewTabPreferences>();
export const searchArcPreferences = getPreferenceValues<SearchArcPreferences>();
