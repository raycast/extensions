import { Action, ActionPanel, Icon, List } from "@raycast/api";

export type ListStatus = { progress: number; error?: Error; retry: () => void };

export const DownloadingEmptyView = ({ status }: { status: ListStatus }) =>
  status.error ? (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Could Not Download the Steam Game List"
      description={status.error.message}
      actions={
        <ActionPanel>
          <Action icon={Icon.ArrowClockwise} title="Try Again" onAction={status.retry} />
        </ActionPanel>
      }
    />
  ) : (
    <List.EmptyView icon={Icon.Download} title={`Updating Game List… ${Math.round(status.progress * 100)}%`} />
  );
