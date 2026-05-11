import { Action, ActionPanel, Icon, openCommandPreferences, openExtensionPreferences } from "@raycast/api";

export function ActionOpenPreferences(props: { showCommandPreferences: boolean; showExtensionPreferences: boolean }) {
  const { showCommandPreferences, showExtensionPreferences } = props;
  return (
    <ActionPanel.Section>
      {showCommandPreferences && (
        <Action
          icon={Icon.Gear}
          title="Configure Command"
          shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      )}
      {showExtensionPreferences && (
        <Action
          icon={Icon.Gear}
          title="Configure Extension"
          shortcut={{ modifiers: ["opt", "cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      )}
    </ActionPanel.Section>
  );
}
