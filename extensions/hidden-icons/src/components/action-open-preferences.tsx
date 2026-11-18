import { Action, ActionPanel, Icon, openCommandPreferences } from "@raycast/api";

export function ActionOpenPreferences() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title="Open Extension Preferences"
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "," },
          Windows: { modifiers: ["ctrl", "shift"], key: "," },
        }}
        onAction={openCommandPreferences}
      />
    </ActionPanel.Section>
  );
}
