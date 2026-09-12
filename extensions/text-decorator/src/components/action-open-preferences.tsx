import { Action, ActionPanel, Icon, openCommandPreferences, openExtensionPreferences } from "@raycast/api";

export function ActionOpenPreferences() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title={"Configure Command"}
        shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        onAction={openCommandPreferences}
      />
      <Action
        icon={Icon.Gear}
        title={"Configure Extension"}
        shortcut={{ modifiers: ["opt", "cmd"], key: "," }}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}
