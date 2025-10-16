import { Action, ActionPanel, Icon, openCommandPreferences, openExtensionPreferences } from "@raycast/api";

export function ActionOpenPreferences(props: { command: boolean }) {
  const { command } = props;
  return (
    <ActionPanel.Section>
      {command && (
        <Action
          icon={Icon.Gear}
          title={"Open Command Preferences"}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      )}
      <Action
        icon={Icon.Gear}
        title={"Open Extension Preferences"}
        shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}
