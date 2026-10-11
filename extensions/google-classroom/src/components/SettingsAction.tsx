import { Action, Icon, openExtensionPreferences } from "@raycast/api";

export function SettingsAction() {
  return <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />;
}
