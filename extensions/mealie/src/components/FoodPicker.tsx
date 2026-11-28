import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { addFoodItem, addNoteItem } from "../api/shopping";
import { filterFoods } from "../lib/foodSearch";
import { useFoods } from "../hooks/useFoods";
import type { MealieClient } from "../api/client";
import type { IngredientFood } from "../types";

interface FoodPickerProps {
  client: MealieClient;
  listId: string;
  listName: string;
  onAdded?: () => void;
}

export function FoodPicker({ client, listId, listName, onAdded }: FoodPickerProps) {
  const { foods, isLoading } = useFoods(client);
  const [searchText, setSearchText] = useState("");

  const matches = useMemo(() => filterFoods(foods, searchText, 60), [foods, searchText]);
  const trimmed = searchText.trim();
  const hasExactMatch = matches.some((food) => food.name.toLowerCase() === trimmed.toLowerCase());

  async function add(action: () => Promise<unknown>, label: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding " + label });
    try {
      await action();
      toast.style = Toast.Style.Success;
      toast.title = "Added " + label;
      toast.message = "to " + listName;
      setSearchText("");
      onAdded?.();
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not add " + label });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={"Add to " + listName}
      filtering={false}
    >
      <List.Section title="Your Foods" subtitle={String(matches.length)}>
        {matches.map((food) => (
          <List.Item
            key={food.id}
            icon={food.label ? { source: Icon.Dot, tintColor: food.label.color } : Icon.Circle}
            title={food.name}
            accessories={labelAccessory(food)}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Plus}
                  title={"Add to " + listName}
                  onAction={() => add(() => addFoodItem(client, listId, food), food.name)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {trimmed && !hasExactMatch && (
        <List.Section title="Not in your foods yet">
          <List.Item
            icon={Icon.Pencil}
            title={'Add "' + trimmed + '" as free text'}
            subtitle="No label, will show under No Label"
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Plus}
                  title={"Add to " + listName}
                  onAction={() => add(() => addNoteItem(client, listId, trimmed), trimmed)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function labelAccessory(food: IngredientFood): List.Item.Accessory[] {
  if (food.label) return [{ tag: { value: food.label.name, color: food.label.color } }];
  return [{ tag: { value: "No label", color: Color.SecondaryText } }];
}
