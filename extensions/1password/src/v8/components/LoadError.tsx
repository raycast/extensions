import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { ConnectionError, ExtensionError, extractOpErrorMessage } from "../utils";

interface LoadErrorProps {
  error: Error;
  isLoading?: boolean;
  onRetry: () => void;
}

export function LoadError({ error, isLoading, onRetry }: LoadErrorProps) {
  const details = extractOpErrorMessage(error.message);
  // `handleErrors` falls back to `new ExtensionError(stderr)`, which leaves the title equal to the
  // raw stderr. Only the curated errors have a title worth showing.
  const hasCuratedTitle = error instanceof ExtensionError && error.title !== error.message;

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        actions={
          <ActionPanel>
            <Action icon={Icon.Repeat} onAction={onRetry} title="Retry" />
            <Action.CopyToClipboard content={details} icon={Icon.Clipboard} title="Copy Error Details" />
          </ActionPanel>
        }
        description={details}
        icon={error instanceof ConnectionError ? Icon.WifiDisabled : Icon.ExclamationMark}
        title={hasCuratedTitle ? error.title : "Could not load from 1Password"}
      />
    </List>
  );
}
