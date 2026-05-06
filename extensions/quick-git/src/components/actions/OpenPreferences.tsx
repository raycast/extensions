import { Action, openExtensionPreferences } from "@raycast/api";

export function OpenPreferences() {
  return <Action title="Open Preferences" onAction={openExtensionPreferences} />;
}
