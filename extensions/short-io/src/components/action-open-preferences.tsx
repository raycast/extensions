import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";

export function ActionOpenPreferences() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title="Configure Extension"
        shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}
