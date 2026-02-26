import { getPreferenceValues } from "@raycast/api";

export const { fontFallback, actionAfterDecoration, itemLayout, columns } = getPreferenceValues<
  ExtensionPreferences & Preferences.DecorateTextWithFont
>();
