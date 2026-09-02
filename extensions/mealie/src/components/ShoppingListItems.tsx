import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, useNavigation, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { FoodPicker } from "./FoodPicker";
import { ItemForm } from "./ItemForm";
import { deleteItem, getShoppingList, updateItem } from "../api/shopping";
import { groupItemsByLabel } from "../lib/shoppingGroups";
import type { MealieClient } from "../api/client";
import type { ShoppingListDetail, ShoppingListItem } from "../types";

interface Props {
  client: MealieClient;
  listId: string;
  listName: string;
}

export function ShoppingListItems({ client, listId, listName }: Props) {
  const { push } = useNavigation();

  const { data, isLoading, mutate, revalidate } = useCachedPromise(
    (id: string) => getShoppingList(client, id),
    [listId],
    {
      onError: (error) => {
        showFailureToast(error, { title: "Could not load the list" });
      },
    },
  );

  const open = (data?.listItems ?? []).filter((item) => !item.checked);
  const done = (data?.listItems ?? []).filter((item) => item.checked);
  const groups = groupItemsByLabel(open, data?.labelSettings ?? []);

  async function toggle(item: ShoppingListItem) {
    try {
      await mutate(updateItem(client, item, { checked: !item.checked }), {
        optimisticUpdate(current?: ShoppingListDetail) {
          if (!current) return current;
          return {
            ...current,
            listItems: current.listItems.map((entry) =>
              entry.id === item.id ? { ...entry, checked: !item.checked } : entry,
            ),
          };
        },
        shouldRevalidateAfter: true,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not update the item" });
    }
  }

  async function remove(item: ShoppingListItem) {
    try {
      await mutate(deleteItem(client, item.id), {
        optimisticUpdate(current?: ShoppingListDetail) {
          if (!current) return current;
          return { ...current, listItems: current.listItems.filter((entry) => entry.id !== item.id) };
        },
        shouldRevalidateAfter: true,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete the item" });
    }
  }

  async function clearChecked() {
    const confirmed = await confirmAlert({
      title: "Delete all checked items?",
      message: done.length + " items will be removed from " + listName + ".",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await Promise.all(done.map((item) => deleteItem(client, item.id)));
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete the checked items" });
    }
  }

  function itemActions(item: ShoppingListItem) {
    return (
      <ActionPanel>
        <Action
          icon={item.checked ? Icon.Circle : Icon.CheckCircle}
          title={item.checked ? "Mark as Open" : "Mark as Done"}
          onAction={() => toggle(item)}
        />
        <Action
          icon={Icon.Plus}
          title="Add Item"
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => push(<FoodPicker client={client} listId={listId} listName={listName} onAdded={revalidate} />)}
        />
        <Action
          icon={Icon.Pencil}
          title="Edit Item"
          shortcut={Keyboard.Shortcut.Common.Edit}
          onAction={() =>
            push(
              <ItemForm
                client={client}
                item={item}
                labelSettings={data?.labelSettings ?? []}
                onSubmit={async (changes) => {
                  try {
                    await updateItem(client, item, changes);
                    revalidate();
                  } catch (error) {
                    await showFailureToast(error, { title: "Could not save the item" });
                  }
                }}
              />,
            )
          }
        />
        <Action
          icon={Icon.Trash}
          title="Delete Item"
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => remove(item)}
        />
        {done.length > 0 && (
          <Action
            icon={Icon.Trash}
            title="Delete All Checked Items"
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            onAction={clearChecked}
          />
        )}
      </ActionPanel>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle={listName} searchBarPlaceholder={"Filter " + listName}>
      <List.EmptyView
        icon={Icon.Cart}
        title="This list is empty"
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Plus}
              title="Add Item"
              onAction={() =>
                push(<FoodPicker client={client} listId={listId} listName={listName} onAdded={revalidate} />)
              }
            />
          </ActionPanel>
        }
      />
      {groups.map((group) => (
        <List.Section key={group.key} title={group.name} subtitle={String(group.items.length)}>
          {group.items.map((item) => (
            <List.Item
              key={item.id}
              icon={{ source: Icon.Circle, tintColor: item.label?.color ?? Color.SecondaryText }}
              title={item.display || item.note || item.food?.name || "Item"}
              actions={itemActions(item)}
            />
          ))}
        </List.Section>
      ))}
      {done.length > 0 && (
        <List.Section title="Done" subtitle={String(done.length)}>
          {done.map((item) => (
            <List.Item
              key={item.id}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              title={item.display || item.note || item.food?.name || "Item"}
              actions={itemActions(item)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
