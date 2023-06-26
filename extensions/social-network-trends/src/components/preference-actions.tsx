import { Action, ActionPanel, Icon, openCommandPreferences, openExtensionPreferences } from "@raycast/api";

export function PreferenceActions() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title={"Open Command Preference"}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={() => {
          openCommandPreferences().then();
        }}
      />
      <Action
        icon={Icon.Gear}
        title={"Open Extension Preference"}
        shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        onAction={() => {
          openExtensionPreferences().then();
        }}
      />
    </ActionPanel.Section>
  );
}
