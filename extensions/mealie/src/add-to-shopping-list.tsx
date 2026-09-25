import { Action, ActionPanel, Icon, List, LocalStorage, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ConfigErrorView } from "./components/ConfigErrorView";
import { FoodPicker } from "./components/FoodPicker";
import { useMealie } from "./hooks/useMealie";
import { getShoppingLists } from "./api/shopping";
import type { ShoppingList } from "./types";

const LAST_LIST_KEY = "mealie.lastShoppingListId";

export default function AddToShoppingList() {
  const { client, configError } = useMealie();
  const { push } = useNavigation();

  const { data: lists, isLoading } = useCachedPromise(() => getShoppingLists(client!), [], {
    execute: client !== undefined,
    initialData: [] as ShoppingList[],
    onError: (error) => {
      showFailureToast(error, { title: "Could not load shopping lists" });
    },
  });

  const { data: lastListId } = useCachedPromise(async () => (await LocalStorage.getItem<string>(LAST_LIST_KEY)) ?? "");

  if (configError) return <ConfigErrorView error={configError} />;

  async function open(list: ShoppingList) {
    await LocalStorage.setItem(LAST_LIST_KEY, list.id);
    push(<FoodPicker client={client!} listId={list.id} listName={list.name} />);
  }

  const ordered = [...lists].sort((a, b) => {
    if (a.id === lastListId) return -1;
    if (b.id === lastListId) return 1;
    return a.name.localeCompare(b.name, "de");
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Pick a shopping list">
      {!isLoading && <List.EmptyView icon={Icon.Cart} title="No shopping lists found" />}
      {ordered.map((list) => (
        <List.Item
          key={list.id}
          icon={Icon.Cart}
          title={list.name}
          accessories={list.id === lastListId ? [{ tag: "Last used" }] : undefined}
          actions={
            <ActionPanel>
              <Action icon={Icon.Plus} title="Add Item to This List" onAction={() => open(list)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
