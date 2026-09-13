import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { RitualCliError } from "../api/cli";

/// Three states, told apart because they need different answers: a missing
/// binary is a setup problem with a fix, an error is a message, and an empty
/// list is good news. The old code showed `spawn ENOENT` for the first.
export function EmptyState({
  error,
  emptyTitle,
  emptyIcon,
}: {
  error?: Error;
  emptyTitle: string;
  emptyIcon: Icon;
}) {
  if (error instanceof RitualCliError && error.kind === "missing") {
    return (
      <List.EmptyView
        icon={Icon.Download}
        title="Ritual isn't installed"
        description="This extension reads your tasks through the Ritual Mac app's command-line tool."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Get Ritual"
              url="https://ritual.from81.app"
            />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }
  if (error) {
    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Couldn't reach Ritual"
        description={error.message}
      />
    );
  }
  return <List.EmptyView icon={emptyIcon} title={emptyTitle} />;
}
