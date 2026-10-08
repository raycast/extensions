import { Action, Icon, openExtensionPreferences } from "@raycast/api";

export function PreferencesAction() {
  return (
    <Action
      title="Open Extension Preferences"
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
    />
  );
}
