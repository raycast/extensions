import { getPreferenceValues } from "@raycast/api";
import type { ExtensionPreferences } from "../types/preferences";
import { validatePreferences } from "./preference-validation";

export function getValidatedPreferences(): ExtensionPreferences {
  return validatePreferences(getPreferenceValues<Preferences.SearchContent>());
}
