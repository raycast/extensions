import { Action, ActionPanel, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Extension Deprecated"
        description="The Fingertip extension has been deprecated. Visit fingertip.com to read more about the deprecation."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Fingertip" url="https://fingertip.com" icon={Icon.Globe} />
          </ActionPanel>
        }
      />
    </List>
  );
}
