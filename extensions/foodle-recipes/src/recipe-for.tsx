import { List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { FoodleSearchtype } from "./utils/types";
import { parseFoodleHtmlForRecipes, fetchFoodleHtml } from "./utils/foodleApi";
import RecipeItem from "./components/RecipeItem";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data: html, error } = fetchFoodleHtml(FoodleSearchtype.Title, searchText);
  const foodleRecipes = html ? parseFoodleHtmlForRecipes(html) : null;

  useEffect(() => {
    if (error) {
      showFailureToast(error, {
        title: "Failed to fetch Foodle results",
      });
    }
  }, [error]);

  return (
    <List
      isLoading={isLoading}
      throttle={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for recipes by name..."
    >
      {foodleRecipes?.map((recipe) => <RecipeItem key={recipe.url} recipe={recipe} />)}
    </List>
  );
}
