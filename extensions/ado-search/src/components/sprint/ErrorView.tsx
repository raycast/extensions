import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

/** Empty view shown when a request failed, with a retry and a shortcut to the preferences. */
export function ErrorView({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <List.EmptyView
      title="Couldn’t load work items"
      description={error.message}
      icon={Icon.ExclamationMark}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
