import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

/** What a list shows when its data could not load: the reason, Retry and the key setting. */
export function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title="Could not load from Brix"
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
