import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { addRecipeToList, getShoppingLists } from "../api/shopping";
import type { MealieClient } from "../api/client";
import type { RecipeSummary, ShoppingList } from "../types";

export function AddIngredientsAction({ client, recipe }: { client: MealieClient; recipe: RecipeSummary }) {
  const { push } = useNavigation();
  return (
    <Action
      icon={Icon.Cart}
      title="Add Ingredients to Shopping List"
      shortcut={Keyboard.Shortcut.Common.Save}
      onAction={() => push(<PickList client={client} recipe={recipe} />)}
    />
  );
}

function PickList({ client, recipe }: { client: MealieClient; recipe: RecipeSummary }) {
  const { pop } = useNavigation();
  const { data, isLoading } = useCachedPromise(() => getShoppingLists(client), [], {
    initialData: [] as ShoppingList[],
    onError: (error) => {
      showFailureToast(error, { title: "Could not load shopping lists" });
    },
  });

  async function add(list: ShoppingList) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding ingredients" });
    try {
      await addRecipeToList(client, list.id, recipe.id);
      toast.style = Toast.Style.Success;
      toast.title = "Added to " + list.name;
      toast.message = recipe.name;
      pop();
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not add the ingredients" });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={"Add " + recipe.name} searchBarPlaceholder="Pick a shopping list">
      <List.EmptyView icon={Icon.Cart} title="No shopping lists found" />
      {data.map((list) => (
        <List.Item
          key={list.id}
          icon={Icon.Cart}
          title={list.name}
          actions={
            <ActionPanel>
              <Action icon={Icon.Plus} title="Add Ingredients Here" onAction={() => add(list)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
