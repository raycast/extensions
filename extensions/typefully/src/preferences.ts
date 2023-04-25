import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "./types";

export const extensionPreferences: ExtensionPreferences = getPreferenceValues();
