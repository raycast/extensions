import { showFailureToast } from "@raycast/utils";
import { getRecipesFromApi } from "../utils/fetchData";
import { RecipesListResult, Recipe, DefaultRecipe } from "../utils/types";
import { toError } from "../utils/errorUtils";

type ListInput = {
  action?: "list" | "get" | "search";
  slug?: string;
  query?: string;
};

type ListResult = RecipesListResult;

function normalizeRecipeSlug(input: string): string {
  return input
    .trim()
    .replace(/^\//, "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function findRecipeBySlug(recipes: Recipe[], slug: string): Recipe | undefined {
  return recipes.find((recipe) => normalizeRecipeSlug(recipe.slug) === slug);
}

export default async function tool(input: ListInput = {}): Promise<Recipe[] | Recipe | ListResult | []> {
  const action = input.action ?? "list";

  try {
    const { featureEnabled, userRecipes, defaultRecipes, sharedRecipes, unlistedRecipes } = await getRecipesFromApi();

    const normalizeDefaultRecipes = (defaults?: DefaultRecipe[]): Recipe[] =>
      (defaults || []).map((d) => ({ slug: d.slug, config: d.defaultConfig }));

    if (action === "list") {
      return { featureEnabled, userRecipes, defaultRecipes, sharedRecipes, unlistedRecipes };
    }

    if (action === "get") {
      if (!input.slug) return [];
      const normalizedSlug = normalizeRecipeSlug(input.slug);
      if (!normalizedSlug) return [];
      const foundUser = findRecipeBySlug(userRecipes, normalizedSlug);
      if (foundUser) return foundUser;
      const foundDefault = (defaultRecipes || []).find((r) => normalizeRecipeSlug(r.slug) === normalizedSlug);
      if (foundDefault) return { slug: foundDefault.slug, config: foundDefault.defaultConfig };
      const foundShared = findRecipeBySlug(sharedRecipes || [], normalizedSlug);
      if (foundShared) return foundShared;
      const foundUnlisted = findRecipeBySlug(unlistedRecipes || [], normalizedSlug);
      return foundUnlisted ?? [];
    }

    if (action === "search") {
      const q = (input.query || "").trim().toLowerCase();
      if (!q) return userRecipes;
      const haystack = (list: Recipe[]) =>
        list.filter((r) => {
          const hay = `${r.slug}\n${r.config?.instructions || ""}`.toLowerCase();
          return hay.includes(q);
        });
      const fromUser = haystack(userRecipes);
      if (fromUser.length > 0) return fromUser;
      const fromDefault = haystack(normalizeDefaultRecipes(defaultRecipes));
      if (fromDefault.length > 0) return fromDefault;
      const fromShared = haystack(sharedRecipes || []);
      if (fromShared.length > 0) return fromShared;
      return haystack(unlistedRecipes || []);
    }

    return [];
  } catch (error) {
    showFailureToast(toError(error), { title: "Failed to load recipes" });
    return [];
  }
}
