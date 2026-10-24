import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { describePlaneError } from "../helpers/errors";
import ChangeWorkspaceAction from "./actions/ChangeWorkspaceAction";

type ErrorEmptyViewProps = {
  error: unknown;
  onRetry?: () => void;
};

/** Empty view that explains why a list failed to load, with fixes one keystroke away. */
export default function ErrorEmptyView({ error, onRetry }: ErrorEmptyViewProps) {
  const { title, message } = describePlaneError(error);
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={title}
      description={message}
      actions={<ErrorActions onRetry={onRetry} />}
    />
  );
}

export function ErrorActions({ onRetry }: { onRetry?: () => void }) {
  return (
    <ActionPanel>
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      {onRetry ? (
        <Action
          title="Retry"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRetry}
        />
      ) : null}
      <ChangeWorkspaceAction />
    </ActionPanel>
  );
}

/** Markdown body for `Detail` views that failed to load. */
export function getErrorMarkdown(error: unknown) {
  const { title, message } = describePlaneError(error);
  return `# ${title}\n\n${message}`;
}
