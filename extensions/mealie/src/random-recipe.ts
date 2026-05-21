import { Toast, open, showToast } from "@raycast/api";
import { recipeWebUrl, searchRecipes } from "./api";

export default async function Command() {
  try {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Picking a recipe…",
    });
    const recipes = await searchRecipes("", 1, 100);

    if (!recipes.length) {
      toast.style = Toast.Style.Failure;
      toast.title = "No recipes found";
      return;
    }

    const recipe = recipes[Math.floor(Math.random() * recipes.length)];
    toast.style = Toast.Style.Success;
    toast.title = recipe.name;
    await open(recipeWebUrl(recipe));
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot open random recipe",
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
