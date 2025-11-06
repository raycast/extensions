import { Action, ActionPanel, Color, Icon, Keyboard, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { deleteList } from "swift:../swift/AppleReminders";

import { UpdateListForm } from "./components/UpdateListForm";
import { CreateListForm } from "./create-list";
import { getListColorIcon } from "./helpers";
import { useData } from "./hooks/useData";

export default function ManageLists() {
  const { data, isLoading, mutate } = useData();

  const handleDeleteList = async (listId: string, listTitle: string) => {
    try {
      if (
        await confirmAlert({
          title: "Delete List",
          message: `Are you sure you want to delete "${listTitle}"? All reminders in this list will also be deleted.`,
          icon: { source: Icon.Trash, tintColor: Color.Red },
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

  return (
    <List isLoading={isLoading}>
      {data?.lists.map((list) => (
        <List.Item
          key={list.id}
          icon={getListColorIcon(list.color)}
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
