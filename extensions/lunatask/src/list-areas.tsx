import { usePromise } from "@raycast/utils";
import { Toast, showToast, Action, ActionPanel, LocalStorage, List, confirmAlert, Alert, Icon } from "@raycast/api";
import AddArea from "./add-area";

async function deleteArea(name: string, revalidate: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Deleting area...",
  });

  if (
    await confirmAlert({
      title: `Delete "${name}" area?`,
      message: "Are you sure you want to delete this area?",
      primaryAction: {
        title: "Delete Area",
        style: Alert.ActionStyle.Destructive,
      },
    })
  ) {
    try {
      await LocalStorage.removeItem(name);

      toast.style = Toast.Style.Success;
      toast.title = `${name} area deleted!`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error deleting area. Please try again.";
    }
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = `${name} area not deleted!`;
  }
}

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(async () => {
    const allAreas = await LocalStorage.allItems();
    return allAreas;
  });

  return (
    <List isLoading={isLoading}>
      {Object.values(data ?? {}).length ? (
        Object.entries(data ?? {}).map(([name, id]) => (
          <List.Item
            title={name}
            key={id}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Area"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={async () => await deleteArea(name, revalidate)}
                  style={Action.Style.Destructive}
                />
                <Action.Push title="Add Area" icon={Icon.PlusCircleFilled} target={<AddArea />} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="No areas added yet"
          actions={
            <ActionPanel>
              <Action.Push title="Add Area" icon={Icon.PlusCircleFilled} target={<AddArea />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
