import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ConfigErrorView } from "./components/ConfigErrorView";
import { AddIngredientsAction } from "./components/AddIngredientsAction";
import { PlanRecipeAction } from "./components/PlanRecipeAction";
import { useGroupSlug, useMealie } from "./hooks/useMealie";
import { searchRecipes } from "./api/recipes";
import { recipeImageUrl, recipeWebUrl } from "./lib/urls";
import type { RecipeSummary } from "./types";

export default function SearchRecipes() {
  const { client, config, configError } = useMealie();
  const [searchText, setSearchText] = useState("");
  const groupSlug = useGroupSlug(client);

  const { data, isLoading } = useCachedPromise((term: string) => searchRecipes(client!, term), [searchText], {
    execute: client !== undefined,
    keepPreviousData: true,
    initialData: [] as RecipeSummary[],
    onError: (error) => {
      showFailureToast(error, { title: "Could not load recipes" });
    },
  });

  if (configError) return <ConfigErrorView error={configError} />;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your Mealie recipes"
      throttle
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title={searchText ? "No recipes found" : "Start typing to search"} />
      {data.map((recipe) => (
        <List.Item
          key={recipe.id}
          icon={{ source: recipeImageUrl(config!.baseUrl, recipe) ?? Icon.Book, fallback: Icon.Book }}
          title={recipe.name}
          subtitle={recipe.description ?? undefined}
          accessories={buildAccessories(recipe)}
          actions={
            <ActionPanel>
              {groupSlug && (
                <Action.OpenInBrowser
                  title="Open in Mealie"
                  url={recipeWebUrl(config!.baseUrl, groupSlug, recipe.slug)}
                />
              )}
              {recipe.orgURL && <Action.OpenInBrowser title="Open Original Source" url={recipe.orgURL} />}
              {client && <PlanRecipeAction client={client} recipe={recipe} />}
              {client && <AddIngredientsAction client={client} recipe={recipe} />}
              {groupSlug && (
                <Action.CopyToClipboard
                  title="Copy Mealie Link"
                  content={recipeWebUrl(config!.baseUrl, groupSlug, recipe.slug)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function buildAccessories(recipe: RecipeSummary): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (recipe.totalTime) accessories.push({ icon: Icon.Clock, text: recipe.totalTime });
  const tag = recipe.tags?.[0] ?? recipe.recipeCategory?.[0];
  if (tag) accessories.push({ tag: tag.name });
  return accessories;
}
