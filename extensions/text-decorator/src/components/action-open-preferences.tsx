import { Action, ActionPanel, Icon, openCommandPreferences, openExtensionPreferences } from "@raycast/api";

export function ActionOpenPreferences() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title={"Open Command Preferences"}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={openCommandPreferences}
      />
      <Action
        icon={Icon.Gear}
        title={"Open Extension Preferences"}
        shortcut={{ modifiers: ["ctrl", "cmd"], key: "," }}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}
