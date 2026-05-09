import { Action, ActionPanel, Icon, List } from "@raycast/api";

export function NotRunningView({ onRetry }: { onRetry: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="macAppLibrary is not running"
        description="Open the macAppLibrary app, then retry."
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
            />
            <Action.Open title="Open Macapplibrary" target="macAppLibrary" />
          </ActionPanel>
        }
      />
    </List>
  );
}
