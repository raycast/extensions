import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { RexError } from "../rex/cli";

const REX_HOMEPAGE = "https://www.superlogical.com/rex";

export function RexNotFound() {
  return (
    <List.EmptyView
      icon={Icon.Terminal}
      title="Rex Not Found"
      description="Rex is in private beta. If you have access, install it in /Applications or set the Rex CLI preference."
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open Rex Website" url={REX_HOMEPAGE} />
        </ActionPanel>
      }
    />
  );
}

export function SnapshotFailed({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const unreachable = error instanceof RexError && error.serverUnreachable;
  return (
    <List.EmptyView
      icon={unreachable ? Icon.Plug : Icon.Warning}
      title={unreachable ? "Rex Server Unreachable" : "Could Not Read Rex Sessions"}
      description={unreachable ? "Open Rex once to start its server, then try again." : error.message}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

export function NoSessions() {
  return (
    <List.EmptyView
      icon={Icon.AppWindowList}
      title="No Sessions"
      description="Create one in Rex, or run `rex new` in a terminal."
    />
  );
}
