import { Action, ActionPanel, Clipboard, Icon, List } from "@raycast/api";
import { clipboardText } from "../lib/errors";

export function ErrorActions({ title, error, retry }: { title: string; error: Error; retry: () => void }) {
  return (
    <>
      <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retry} />
      <Action
        title="Copy Error"
        icon={Icon.CopyClipboard}
        onAction={() => Clipboard.copy(clipboardText(title, error))}
      />
    </>
  );
}

export function ErrorEmptyView({ title, error, retry }: { title: string; error: Error; retry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={title}
      description={error.message}
      actions={
        <ActionPanel>
          <ErrorActions title={title} error={error} retry={retry} />
        </ActionPanel>
      }
    />
  );
}
