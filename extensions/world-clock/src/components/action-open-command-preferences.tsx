import { Action, ActionPanel, Icon, openCommandPreferences, openExtensionPreferences } from "@raycast/api";

export function ActionOpenCommandPreferences(props: { command: boolean; extension: boolean }) {
  const { command, extension } = props;
  return (
    <ActionPanel.Section>
      {command && (
        <Action
          icon={Icon.Gear}
          title="Open Command Preferences"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      )}
      {extension && (
        <Action
          icon={Icon.Gear}
          title="Open Extension Preferences"
          shortcut={{ modifiers: ["ctrl", "cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      )}
    </ActionPanel.Section>
  );
}
