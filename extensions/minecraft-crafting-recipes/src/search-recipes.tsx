import { List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { baseUrl, parseRecipes } from "minecraft-crafting-info";
import { useState } from "react";
import MaterialTag from "./components/MaterialTag";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const {
    isLoading,
    data: rawHtml,
    error,
  } = useFetch(baseUrl, {
    parseResponse(response) {
      return response.text();
    },
  });

  if (error) {
    showFailureToast(error);
  }

  const recipes = rawHtml ? parseRecipes(rawHtml) : null;

  return (
    <List isLoading={isLoading} isShowingDetail filtering searchText={searchText} onSearchTextChange={setSearchText}>
      {recipes?.map((recipe) => (
        <List.Item
          key={recipe.itemName}
          title={recipe.itemName}
          subtitle={recipe.itemDescription}
          detail={
            <List.Item.Detail
              markdown={`![Crafting recipe for ${recipe.itemName}](${recipe.recipeImage})`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Item name" text={recipe.itemName} />
                  <List.Item.Detail.Metadata.Label title="Item description" text={recipe.itemDescription} />
                  <List.Item.Detail.Metadata.TagList title="Materials">
                    {recipe.materialsList.map((material) => (
                      <MaterialTag key={material} material={material} setSearchText={setSearchText} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
