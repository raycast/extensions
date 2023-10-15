import { getPreferenceValues } from "@raycast/api";
import { NewTabPreferences } from "./types";

export const newTabPreferences = getPreferenceValues<NewTabPreferences>();
