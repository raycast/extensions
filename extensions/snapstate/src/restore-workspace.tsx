import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  openSnapState,
  readWorkspaceSummaries,
  SNAPSTATE_DOWNLOAD_URL,
  WorkspaceSummary,
  workspaceAccessory,
} from "./lib";

export default function RestoreWorkspace() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    readWorkspaceSummaries().then((summaries) => {
      if (isCurrent) {
        setWorkspaces(summaries);
        setIsLoading(false);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  async function restore(workspace: WorkspaceSummary) {
    try {
      await openSnapState("restore", { workspace: workspace.id });
      await showToast({
        style: Toast.Style.Success,
        title: `Restoring ${workspace.name}`,
        message: "SnapState is bringing the workspace back.",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "SnapState is not available",
        message: "Install or launch SnapState, then try again.",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Restore a SnapState workspace">
      {!isLoading && workspaces.length === 0 ? (
        <List.EmptyView
          icon="icon.png"
          title="No SnapState workspaces yet"
          description="Open SnapState once, save a workspace, and it will appear here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get SnapState" url={SNAPSTATE_DOWNLOAD_URL} />
            </ActionPanel>
          }
        />
      ) : (
        workspaces.map((workspace) => (
          <List.Item
            key={workspace.id}
            icon="icon.png"
            title={workspace.name}
            subtitle={workspaceAccessory(workspace)}
            accessories={[{ text: `${workspace.windowCount} windows` }]}
            actions={
              <ActionPanel>
                <Action title="Restore Workspace" icon={Icon.Play} onAction={() => restore(workspace)} />
                <Action.OpenInBrowser title="Get SnapState" url={SNAPSTATE_DOWNLOAD_URL} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
