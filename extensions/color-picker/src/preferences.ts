import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences, OrganizeColorsCommandPreferences } from "./types";

export const extensionPreferences: ExtensionPreferences = getPreferenceValues();
export const organizeColorsCommandPreferences: OrganizeColorsCommandPreferences = getPreferenceValues();
