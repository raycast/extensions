import { Action, Icon, openCommandPreferences } from "@raycast/api";

export function ActionOpenPreferences() {
  // Return only the Action, not wrapped in a section
  return <Action icon={Icon.Gear} title={"Open Command Preferences"} onAction={openCommandPreferences} />;
}
