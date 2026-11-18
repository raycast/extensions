import { Action, ActionPanel, Icon, List } from "@raycast/api";

/** What a list shows when Mac Browse can't be reached, instead of a misleading "no results". */
export function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title="Couldn't reach Mac Browse"
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}
