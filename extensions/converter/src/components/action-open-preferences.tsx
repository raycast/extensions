import { Action, ActionPanel, Icon, openCommandPreferences, openExtensionPreferences } from "@raycast/api";

export function ActionOpenPreferences(props: { showCommandPreferences: boolean; showExtensionPreferences: boolean }) {
  const { showCommandPreferences, showExtensionPreferences } = props;
  return (
    <ActionPanel.Section>
      {showCommandPreferences && (
        <Action
          icon={Icon.Gear}
          title="Open Command Preferences"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      )}
      {showExtensionPreferences && (
        <Action
          icon={Icon.Gear}
          title="Open Extension Preferences"
          shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      )}
    </ActionPanel.Section>
  );
}
