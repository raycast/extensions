import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { getErrorMessage, getFlashspacePath, parseLines, runFlashspaceAsync } from "../utils/cli";

export default function DeleteWorkspace() {
  const flashspace = getFlashspacePath();

  const { isLoading, data, revalidate } = useExec(flashspace, ["list-workspaces"], {
    parseOutput: ({ stdout }) => parseLines(stdout),
    failureToastOptions: { title: "Failed to list workspaces" },
  });

  async function handleDelete(name: string) {
    const confirmed = await confirmAlert({
      title: "Delete Workspace",
      message: `Are you sure you want to delete "${name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting workspace..." });

    try {
      await runFlashspaceAsync(["delete-workspace", name]);
      toast.style = Toast.Style.Success;
      toast.title = `Workspace "${name}" deleted`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete workspace";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces to delete...">
      {data?.map((name) => (
        <List.Item
          key={name}
          title={name}
          icon={Icon.Window}
          actions={
            <ActionPanel>
              <Action
                title="Delete Workspace"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(name)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
