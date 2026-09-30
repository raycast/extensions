import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";

export function ActionOpenPreferences() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title="Configure Extension"
        shortcut={{
          macOS: { modifiers: ["shift", "cmd"], key: "," },
          Windows: { modifiers: ["shift", "ctrl"], key: "," },
        }}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}
