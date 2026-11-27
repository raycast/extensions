import { Action, ActionPanel, Icon, List } from "@raycast/api";

type Revalidate = () => unknown;

export function LoadFailureEmptyView({
  title,
  description,
  revalidate,
}: {
  title: string;
  description: string;
  revalidate: Revalidate;
}) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
