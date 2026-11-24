import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";

interface Props {
  error: Error;
  onRetry: () => void;
  grid?: boolean;
}

/** Shown instead of the "no results" state when a UEFA request fails. */
export default function ErrorView({ error, onRetry, grid }: Props) {
  const EmptyView = grid ? Grid.EmptyView : List.EmptyView;

  return (
    <EmptyView
      icon={Icon.Warning}
      title="Couldn't load data from UEFA"
      description={`${error.message}\nPress ↵ to try again.`}
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
