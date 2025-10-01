import { Action, ActionPanel, Color, Icon, Keyboard, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { deleteList } from "swift:../swift/AppleReminders";

import { UpdateListForm } from "./components/UpdateListForm";
import { CreateListForm } from "./create-list";
import { useData } from "./hooks/useData";

export default function ManageLists() {
  const { data, isLoading, mutate } = useData();

  const handleDeleteList = async (listId: string, listTitle: string) => {
    try {
      if (
        await confirmAlert({
          title: "Delete List",
          message: `Are you sure you want to delete "${listTitle}"? All reminders in this list will also be deleted.`,
          primaryAction: {
            title: "Delete",
            style: Action.Style.Destructive,
          },
        })
      ) {
        await deleteList(listId);
        await showToast({
          style: Toast.Style.Success,
          title: "Deleted List",
          message: listTitle,
        });
        await mutate();
      }
    } catch (error) {
      console.log(error);
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to delete list",
        message,
      });
    }
  };

  const getColorIcon = (colorHex: string) => {
    const colorMap: Record<string, Color> = {
      "#FF3B30": Color.Red,
      "#FF9500": Color.Orange,
      "#FFCC00": Color.Yellow,
      "#34C759": Color.Green,
      "#007AFF": Color.Blue,
      "#AF52DE": Color.Purple,
      "#FF2D55": Color.Magenta,
    };
    return { source: Icon.Circle, tintColor: colorMap[colorHex] || colorHex };
  };

  return (
    <List isLoading={isLoading}>
      {data?.lists.map((list) => (
        <List.Item
          key={list.id}
          icon={getColorIcon(list.color)}
          title={list.title}
          subtitle={list.isDefault ? "Default" : ""}
          accessories={[
            {
              text: `${data.reminders.filter((r) => r.list?.id === list.id).length} reminders`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Pencil}
                title="Edit List"
                target={<UpdateListForm list={list} onUpdate={mutate} />}
              />
              <Action.Push icon={Icon.Plus} title="Create New List" target={<CreateListForm />} />
              {!list.isDefault && (
                <Action
                  title="Delete List"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDeleteList(list.id, list.title)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}

      <List.EmptyView
        title="No Lists Found"
        description="Press ⏎ to create your first list"
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.Plus} title="Create New List" target={<CreateListForm />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
