import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { MiseExitError } from "../mise/exec";

// The view renders LoadError in place of its list, so the hook's default failure toast is off.
export const loadErrorInView = { onError: () => undefined };

export function LoadError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title="Couldn't load from mise"
      description={loadErrorMessage(error)}
      actions={
        <ActionPanel>
          <Action
            title="Retry"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={retry}
          />
          <Action.CopyToClipboard title="Copy Error" content={error.message} />
        </ActionPanel>
      }
    />
  );
}

export function loadErrorMessage(error: Error): string {
  if (!(error instanceof MiseExitError)) return error.message;
  const lines = error.stderr.split("\n").map((line) => line.trim());
  return lines.findLast((line) => line !== "") ?? error.message;
}
