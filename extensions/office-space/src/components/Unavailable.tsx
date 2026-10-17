import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { HubNotFoundError, OutdatedAppError } from "../lib/hub";

/** Shown when hub is missing or too old, or the helper isn't running. */
export function Unavailable(props: { error: Error }) {
  const { error } = props;
  if (error instanceof OutdatedAppError) {
    return (
      <List.EmptyView
        icon={Icon.ArrowClockwise}
        title="Office Space needs an update"
        description={error.message}
        actions={
          <ActionPanel>
            <Action title="Update Office Space" icon={Icon.Download} onAction={() => open("officespace://update")} />
            <Action.OpenInBrowser
              title="Download from GitHub"
              url="https://github.com/kocheck/office-space/releases/latest"
            />
          </ActionPanel>
        }
      />
    );
  }
  const missing = error instanceof HubNotFoundError;
  return (
    <List.EmptyView
      icon={missing ? Icon.Download : Icon.Warning}
      title={missing ? "Office Space isn't installed" : "Office Space isn't responding"}
      description={error.message}
      actions={
        <ActionPanel>
          {missing ? (
            <Action.OpenInBrowser
              title="Download Office Space"
              url="https://github.com/kocheck/office-space/releases/latest"
            />
          ) : (
            <Action.Open title="Open Office Space" target="/Applications/OfficeSpace.app" />
          )}
        </ActionPanel>
      }
    />
  );
}
