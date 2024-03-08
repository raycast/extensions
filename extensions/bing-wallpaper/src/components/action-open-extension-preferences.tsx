import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";

export function ActionOpenExtensionPreferences() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title="Open Extension Preferences"
        shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}
