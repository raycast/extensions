import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

/** What a list shows when Rex cannot be read, instead of looking like "no sessions". */
export function ErrorEmptyView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Could Not Read Rex"
      description={`${error.message}\nIs the Rex server running? You can also set the path of the rex CLI.`}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
