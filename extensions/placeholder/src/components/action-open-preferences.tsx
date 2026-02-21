import { Action, ActionPanel, Icon, Keyboard, openCommandPreferences, openExtensionPreferences } from "@raycast/api";

export function ActionOpenPreferences() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title="Configure Command"
        shortcut={Keyboard.Shortcut.Common.CopyPath}
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
