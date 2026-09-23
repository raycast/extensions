import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

/** Warning every command shows while the path to the ghq binary is not set. */
export function GhqPathNotConfigured() {
  return (
    <EmptyState
      title="ghq Path Not Configured"
      description="Set the absolute path to the ghq binary in the extension preferences."
    />
  );
}

/** Full-view warning whose only action opens the extension preferences. */
export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title={title}
        description={description}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
