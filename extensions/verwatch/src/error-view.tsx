import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

/**
 * What a list shows when its data failed to load and there is nothing
 * cached to fall back on: the reason, and a way to try again.
 */
export function ErrorView({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <List.EmptyView
      icon={{ source: Icon.Warning, tintColor: Color.Red }}
      title="Couldn't load from VerWatch"
      description={error.message}
      actions={
        <ActionPanel>
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            onAction={onRetry}
          />
        </ActionPanel>
      }
    />
  );
}
