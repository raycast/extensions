import { List, ActionPanel, Action, Icon } from "@raycast/api";

interface ConfigurationRequiredProps {
  onOpenPreferences: () => void;
}

export function ConfigurationRequired({ onOpenPreferences }: ConfigurationRequiredProps) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Configuration Required"
        description="Please set your API token and project ID in extension preferences"
        actions={
          <ActionPanel>
            <Action title="Open Preferences" icon={Icon.Gear} onAction={onOpenPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
