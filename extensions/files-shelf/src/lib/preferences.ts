import { getPreferenceValues } from "@raycast/api";

export interface ExtensionPreferences {
  keepShelfAfterCompletion?: boolean;
}

export function keepShelfAfterCompletion(): boolean {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  return Boolean(prefs.keepShelfAfterCompletion);
}
