import { Action, ActionPanel, Alert, confirmAlert, Icon, Image, List, showHUD, showToast, Toast } from "@raycast/api";
import { useExec, usePromise } from "@raycast/utils";
import { getErrorMessage, getFlashspacePath, parseWorkspaces, runFlashspaceAsync } from "../utils/cli";
import { loadWorkspaceIconsAsync } from "../utils/workspace-icons";

export default function ListWorkspaces() {
  const flashspace = getFlashspacePath();

  const { isLoading, data, revalidate } = useExec(flashspace, ["list-workspaces", "--with-display"], {
    parseOutput: ({ stdout }) => parseWorkspaces(stdout),
    failureToastOptions: { title: "Failed to list workspaces" },
  });

  const { data: activeWorkspace, revalidate: revalidateActiveWorkspace } = useExec(flashspace, ["get-workspace"], {
    parseOutput: ({ stdout }) => stdout.trim(),
    failureToastOptions: { title: "Failed to get active workspace" },
  });

  const { data: activeProfile } = useExec(flashspace, ["get-profile"], {
    parseOutput: ({ stdout }) => stdout.trim(),
    failureToastOptions: { title: "Failed to get active profile" },
  });

  const { data: workspaceIcons = {} as Record<string, Image.ImageLike> } = usePromise(
    (profile: string | undefined): Promise<Record<string, Image.ImageLike>> =>
      profile ? loadWorkspaceIconsAsync(profile) : Promise.resolve({}),
    [activeProfile],
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces...">
      {data?.map((workspace) => (
        <List.Item
          key={workspace.name}
          title={workspace.name}
          subtitle={workspace.display}
          icon={workspaceIcons[workspace.name] || Icon.Window}
          accessories={activeWorkspace === workspace.name ? [{ tag: "Active" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Activate Workspace"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  try {
                    await runFlashspaceAsync(["workspace", "--name", workspace.name]);
                    await showHUD(`Switched to "${workspace.name}"`);
                    revalidate();
                    revalidateActiveWorkspace();
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to activate workspace",
                      message: getErrorMessage(error),
                    });
                  }
                }}
              />
              <Action
                title="Delete Workspace"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Delete Workspace",
                    message: `Are you sure you want to delete "${workspace.name}"?`,
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  });
                  if (!confirmed) return;
                  const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting workspace..." });
                  try {
                    await runFlashspaceAsync(["delete-workspace", workspace.name]);
                    toast.style = Toast.Style.Success;
                    toast.title = `Workspace "${workspace.name}" deleted`;
                    revalidate();
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to delete workspace";
                    toast.message = getErrorMessage(error);
                  }
                }}
              />
              <Action.CopyToClipboard title="Copy Name" content={workspace.name} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
