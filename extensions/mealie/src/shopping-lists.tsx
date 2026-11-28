import { Action, ActionPanel, Alert, Icon, List, confirmAlert, useNavigation, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ConfigErrorView } from "./components/ConfigErrorView";
import { NameForm } from "./components/NameForm";
import { ShoppingListItems } from "./components/ShoppingListItems";
import { useGroupSlug, useMealie } from "./hooks/useMealie";
import { createShoppingList, deleteShoppingList, getShoppingLists, renameShoppingList } from "./api/shopping";
import { shoppingListWebUrl } from "./lib/urls";
import type { ShoppingList } from "./types";

export default function ShoppingLists() {
  const { client, config, configError } = useMealie();
  const { push } = useNavigation();
  const groupSlug = useGroupSlug(client);

  const { data, isLoading, revalidate } = useCachedPromise(() => getShoppingLists(client!), [], {
    execute: client !== undefined,
    initialData: [] as ShoppingList[],
    onError: (error) => {
      showFailureToast(error, { title: "Could not load shopping lists" });
    },
  });

  if (configError) return <ConfigErrorView error={configError} />;

  async function runAndRefresh(action: () => Promise<unknown>, failureTitle: string) {
    try {
      await action();
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: failureTitle });
    }
  }

  async function confirmDelete(list: ShoppingList) {
    const confirmed = await confirmAlert({
      title: "Delete " + list.name + "?",
      message: "This removes the list and all of its items in Mealie.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await runAndRefresh(() => deleteShoppingList(client!, list.id), "Could not delete the list");
    }
  }

  const newListAction = (
    <Action
      icon={Icon.Plus}
      title="New Shopping List"
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={() =>
        push(
          <NameForm
            title="New Shopping List"
            submitTitle="Create List"
            onSubmit={(name) => runAndRefresh(() => createShoppingList(client!, name), "Could not create the list")}
          />,
        )
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter shopping lists">
      {!isLoading && (
        <List.EmptyView
          icon={Icon.Cart}
          title="No shopping lists yet"
          actions={<ActionPanel>{newListAction}</ActionPanel>}
        />
      )}
      {data.map((list) => (
        <List.Item
          key={list.id}
          icon={Icon.Cart}
          title={list.name}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.List}
                title="Open List"
                onAction={() => push(<ShoppingListItems client={client!} listId={list.id} listName={list.name} />)}
              />
              {newListAction}
              <Action
                icon={Icon.Pencil}
                title="Rename List"
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() =>
                  push(
                    <NameForm
                      title="Rename Shopping List"
                      submitTitle="Rename"
                      initialValue={list.name}
                      onSubmit={(name) =>
                        runAndRefresh(() => renameShoppingList(client!, list, name), "Could not rename the list")
                      }
                    />,
                  )
                }
              />
              {groupSlug && (
                <Action.OpenInBrowser
                  title="Open in Mealie"
                  url={shoppingListWebUrl(config!.baseUrl, groupSlug, list.id)}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              )}
              <Action
                icon={Icon.Trash}
                title="Delete List"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => confirmDelete(list)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
