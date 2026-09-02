import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { searchRecipes } from "../api/recipes";
import type { MealieClient } from "../api/client";
import type { RecipeSummary } from "../types";

interface Props {
  client: MealieClient;
  navigationTitle: string;
  onPick: (recipe: RecipeSummary) => void;
  onPickFreeText?: (title: string) => void;
}

export function RecipePicker({ client, navigationTitle, onPick, onPickFreeText }: Props) {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useCachedPromise((term: string) => searchRecipes(client, term), [searchText], {
    keepPreviousData: true,
    initialData: [] as RecipeSummary[],
    onError: (error) => {
      showFailureToast(error, { title: "Could not load recipes" });
    },
  });

  const trimmed = searchText.trim();

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search a recipe"
      throttle
    >
      <List.Section title="Recipes">
        {data.map((recipe) => (
          <List.Item
            key={recipe.id}
            icon={Icon.Book}
            title={recipe.name}
            actions={
              <ActionPanel>
                <Action icon={Icon.Check} title="Choose Recipe" onAction={() => onPick(recipe)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {onPickFreeText && trimmed && (
        <List.Section title="Without a recipe">
          <List.Item
            icon={Icon.Pencil}
            title={'Use "' + trimmed + '" as a plain entry'}
            actions={
              <ActionPanel>
                <Action icon={Icon.Check} title="Use Free Text" onAction={() => onPickFreeText(trimmed)} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
