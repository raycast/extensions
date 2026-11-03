import { Action, ActionPanel, Clipboard, Icon, List } from "@raycast/api";

/** The failure state for a list that has no data: a clear message, Retry and Copy Error. */
export function ErrorEmptyView({ title, error, retry }: { title: string; error: Error; retry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={title}
      description="Check your connection, then try again."
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retry} />
          <Action title="Copy Error" icon={Icon.CopyClipboard} onAction={() => Clipboard.copy(error.message)} />
        </ActionPanel>
      }
    />
  );
}
