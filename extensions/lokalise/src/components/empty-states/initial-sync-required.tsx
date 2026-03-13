import { List, ActionPanel, Action, Icon } from "@raycast/api";

interface InitialSyncRequiredProps {
  onSync: () => void;
  onOpenPreferences: () => void;
}

export function InitialSyncRequired({ onSync, onOpenPreferences }: InitialSyncRequiredProps) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Download}
        title="Initial Sync Required"
        description="Sync translations from Lokalise to enable local filtering"
        actions={
          <ActionPanel>
            <Action
              title="Sync Now"
              icon={Icon.ArrowClockwise}
              onAction={onSync}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={onOpenPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
