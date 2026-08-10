import { useEffect } from "react";
import { Action, ActionPanel, List, showToast, Toast, open } from "@raycast/api";

export const NotFound = ({ command }: { command: string }) => {
  useEffect(() => {
    showToast({
      style: Toast.Style.Failure,
      title: "No matching man page found!",
      primaryAction: {
        title: "Search on manpages.org",
        onAction: (toast) => open(`https://manpages.org/${command}`).then(() => toast.hide()),
      },
    });
  }, []);

  return (
    <List searchBarPlaceholder="">
      <List.EmptyView
        title={`No local entry for ${command}`}
        icon="command-icon.png"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={`https://manpages.org/${command}`} title="Search on manpages.org" />
          </ActionPanel>
        }
      />
    </List>
  );
};
