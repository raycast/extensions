import React from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  RecipeSummary,
  getCurrentUser,
  recipeImageUrl,
  recipeWebUrl,
  searchRecipes,
} from "./api";

function recipeAccessories(recipe: RecipeSummary): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (recipe.totalTime)
    accessories.push({ text: recipe.totalTime, icon: Icon.Clock });
  if (recipe.recipeYield)
    accessories.push({ text: recipe.recipeYield, icon: Icon.Person });
  if (recipe.tags?.[0]?.name)
    accessories.push({
      text: recipe.tags[0].name,
      tag: { value: recipe.tags[0].name, color: Color.Green },
    });

  return accessories;
}

function subtitle(recipe: RecipeSummary): string | undefined {
  const parts = [
    recipe.description,
    recipe.recipeCategory?.map((c) => c.name).join(", "),
  ].filter(Boolean);
  return parts.join(" · ") || undefined;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (query: string) => {
      await getCurrentUser();
      return searchRecipes(query);
    },
    [searchText],
    {
      keepPreviousData: true,
      onError: async (e) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot connect to Mealie",
          message: e.message,
        });
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recipes…"
      onSearchTextChange={setSearchText}
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Cannot Connect to Mealie"
          description={error.message}
        />
      ) : null}

      {(data || []).map((recipe) => (
        <List.Item
          key={recipe.slug}
          icon={recipeImageUrl(recipe) || Icon.Book}
          title={recipe.name}
          subtitle={subtitle(recipe)}
          accessories={recipeAccessories(recipe)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Mealie"
                url={recipeWebUrl(recipe)}
              />
              <Action.CopyToClipboard
                title="Copy Recipe URL"
                content={recipeWebUrl(recipe)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}

      {!isLoading && !error && data?.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No Recipes Found" />
      ) : null}
    </List>
  );
}
