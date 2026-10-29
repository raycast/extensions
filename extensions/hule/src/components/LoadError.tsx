import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

/**
 * A failed load inside a list, shown as what it is. Without it the list falls
 * through to its empty state — "Nothing Found" for a request that never
 * answered — or keeps the previous query's rows under the new query.
 */
export function LoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Could Not Load Tasks"
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
