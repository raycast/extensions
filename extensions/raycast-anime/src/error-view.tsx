import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";

type ErrorViewProps = {
  description?: string;
  isGallery?: boolean;
  onRetry: () => void;
  title?: string;
};

export function ErrorView({
  description = "Try again in a moment.",
  isGallery = false,
  onRetry,
  title = "Could Not Load Anime",
}: ErrorViewProps) {
  const actions = (
    <ActionPanel>
      <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
    </ActionPanel>
  );

  if (isGallery) {
    return <Grid.EmptyView title={title} description={description} actions={actions} />;
  }

  return <List.EmptyView title={title} description={description} actions={actions} />;
}
