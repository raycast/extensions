import { Action, ActionPanel, Icon, openCommandPreferences, openExtensionPreferences } from "@raycast/api";

export function ActionOpenCommandPreferences(props: { command: boolean; extension: boolean }) {
  const { command, extension } = props;
  return (
    <ActionPanel.Section>
      {command && (
        <Action
          icon={Icon.Gear}
          title="Configure Command"
          shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      )}
      {extension && (
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
