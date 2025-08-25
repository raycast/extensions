import { Action, ActionPanel, Icon } from "@raycast/api";

interface PreferencesActionsProps {
  onOpenPreferences: () => void;
}

export function PreferencesActions({ onOpenPreferences }: PreferencesActionsProps) {
  return (
    <ActionPanel>
      <Action
        title="Open Preferences"
        icon={Icon.Gear}
        onAction={onOpenPreferences}
        shortcut={{ modifiers: ["cmd"], key: "," }}
      />
    </ActionPanel>
  );
}
