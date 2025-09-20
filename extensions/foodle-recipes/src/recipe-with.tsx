import { LaunchProps, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { FoodleRecipe, FoodleSearchtype } from "./utils/types";
import { parseFoodleHtmlForRecipes, fetchFoodleHtml } from "./utils/foodleApi";
import RecipeItem from "./components/RecipeItem";

export default function Command(props: LaunchProps<{ arguments: Arguments.RecipeWith }>) {
  const ingredients = props.arguments.ingredients || "";
  const [searchText, setSearchText] = useState<string>(ingredients);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [foodleRecipes, setFoodleRecipes] = useState<FoodleRecipe[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        const html = await fetchFoodleHtml(FoodleSearchtype.Ingredient, searchText);
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
      searchBarPlaceholder="Search for recipes by ingredients..."
    >
      {foodleRecipes?.map((recipe) => <RecipeItem key={recipe.url} recipe={recipe} />)}
    </List>
  );
}
