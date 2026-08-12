import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { getErrorMessage, getFlashspacePath, parseLines, runFlashspaceAsync } from "../utils/cli";

export default function DeleteProfile() {
  const flashspace = getFlashspacePath();

  const { isLoading, data, revalidate } = useExec(flashspace, ["list-profiles"], {
    parseOutput: ({ stdout }) => parseLines(stdout),
    failureToastOptions: { title: "Failed to list profiles" },
  });

  async function handleDelete(name: string) {
    const confirmed = await confirmAlert({
      title: "Delete Profile",
      message: `Are you sure you want to delete "${name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting profile..." });

    try {
      await runFlashspaceAsync(["delete-profile", name]);
      toast.style = Toast.Style.Success;
      toast.title = `Profile "${name}" deleted`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete profile";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles to delete...">
      {data?.map((name) => (
        <List.Item
          key={name}
          title={name}
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <Action
                title="Delete Profile"
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
