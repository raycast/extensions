import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";

export function SessionLoadError({
  error,
  retry,
  isLoading,
}: {
  error: unknown;
  retry: () => unknown;
  isLoading: boolean;
}) {
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions">
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Could not load sessions"
        description={error instanceof Error ? error.message : String(error)}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={retry}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
