import { Action, ActionPanel, Icon, List } from "@raycast/api";

/** Shown when Spacepal's Space list cannot be read. */
export function MissingSpacepal() {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title="Spacepal's Space list was not found"
      description="Install and open Spacepal, give it Accessibility permission, then run this command again."
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Download Spacepal" url="https://getspacepal.com/download/" />
        </ActionPanel>
      }
    />
  );
}
