import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export const preferences: Preferences = getPreferenceValues();

export const layout = preferences.layout;
