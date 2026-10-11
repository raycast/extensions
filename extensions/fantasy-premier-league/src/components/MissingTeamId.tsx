import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

export function PreferencesAction() {
  return (
    <Action
      title="Change Team ID"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
      onAction={openExtensionPreferences}
    />
  );
}

export function MissingTeamId() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Gear}
        title="Set your FPL Team ID"
        description="Open fantasy.premierleague.com, go to Points, and copy the number after /entry/ in the URL."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export function EntryNotFound({ entryId }: { entryId: number }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.QuestionMarkCircle}
        title={`No FPL team with ID ${entryId}`}
        description="Check the Team ID in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
