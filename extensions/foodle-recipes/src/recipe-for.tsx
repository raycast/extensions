import { LaunchProps, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { FoodleRecipe, FoodleSearchtype } from "./utils/types";
import { parseFoodleHtmlForRecipes, fetchFoodleHtml } from "./utils/foodleApi";
import RecipeItem from "./components/RecipeItem";

export default function Command(props: LaunchProps<{ arguments: Arguments.RecipeFor }>) {
  const name = props.arguments.name || "";
  const [searchText, setSearchText] = useState<string>(name);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [foodleRecipes, setFoodleRecipes] = useState<FoodleRecipe[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        const html = await fetchFoodleHtml(FoodleSearchtype.Title, searchText);
        setFoodleRecipes(html ? parseFoodleHtmlForRecipes(html) : []);
      } catch (err) {
        await showFailureToast(err, {
          title: "Failed to fetch Foodle results",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (searchText) {
      fetchData();
    }
  }, [searchText]);

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
