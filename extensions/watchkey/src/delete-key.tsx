import { Action, ActionPanel, List, showToast, Toast, confirmAlert, Alert, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useInstallGuard } from "./install-guard";
import { useUpdateCheck } from "./use-update-check";
import { watchkeyDelete, watchkeyList } from "./watchkey";

export default function DeleteKey() {
  const { installed, installView } = useInstallGuard();
  useUpdateCheck();
  const { data: keys, isLoading, revalidate } = usePromise(watchkeyList, [], { execute: installed });

  if (!installed) return installView;

  async function handleDelete(service: string) {
    const confirmed = await confirmAlert({
      title: `Delete "${service}"?`,
      message: "This cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting secret..." });
    try {
      await watchkeyDelete(service);
      toast.style = Toast.Style.Success;
      toast.title = `Deleted "${service}"`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete secret";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search keys...">
      <List.EmptyView title="No Keys Found" description="Use Set Key to store a secret first." />
      {keys?.map((key) => (
        <List.Item
          key={key}
          title={key}
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action
                title="Delete Secret"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(key)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
