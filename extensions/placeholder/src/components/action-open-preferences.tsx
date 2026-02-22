import { Action, ActionPanel, Icon, openCommandPreferences, openExtensionPreferences } from "@raycast/api";

export function ActionOpenPreferences() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title="Configure Command"
        shortcut={{
          macOS: { modifiers: ["shift", "cmd"], key: "," },
          Windows: { modifiers: ["shift", "ctrl"], key: "," },
        }}
        onAction={openCommandPreferences}
      />
      <Action
        icon={Icon.Gear}
        title="Configure Extension"
        shortcut={{ macOS: { modifiers: ["opt", "cmd"], key: "," }, Windows: { modifiers: ["opt", "ctrl"], key: "," } }}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}
