import { showFailureToast } from "@raycast/utils";
import { getRecipesFromApi } from "../utils/fetchData";
import { RecipesListResult, Recipe, DefaultRecipe } from "../utils/types";

type ListInput = {
  action?: "list" | "get" | "search";
  slug?: string;
  query?: string;
};

type ListResult = RecipesListResult;

// API moved to utils/fetchData.getRecipesFromApi

function slugifyRecipeSlug(input: string): string {
  return input.trim().replace(/^\//, "").toLowerCase().replace(/\s+/g, "-");
}

export default async function tool(input: ListInput = {}): Promise<Recipe[] | Recipe | ListResult | []> {
  const action = input.action ?? "list";

  try {
    const { featureEnabled, userRecipes, defaultRecipes, sharedRecipes } = await getRecipesFromApi();

    const normalizeDefaultRecipes = (defaults?: DefaultRecipe[]): Recipe[] =>
      (defaults || []).map((d) => ({ slug: d.slug, config: d.defaultConfig }));

    if (action === "list") {
      return { featureEnabled, userRecipes, defaultRecipes, sharedRecipes };
    }

    if (action === "get") {
      if (!input.slug) return [];
      const normalizedSlug = slugifyRecipeSlug(input.slug);
      const foundUser = userRecipes.find((r) => r.slug === normalizedSlug);
      if (foundUser) return foundUser;
      const foundDefault = (defaultRecipes || []).find((r) => r.slug === normalizedSlug);
      if (foundDefault) return { slug: foundDefault.slug, config: foundDefault.defaultConfig };
      const foundShared = (sharedRecipes || []).find((r) => r.slug === normalizedSlug);
      return foundShared ?? [];
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
      return haystack(sharedRecipes || []);
    }

    return [];
  } catch (error) {
    showFailureToast(error, { title: "Failed to load recipes" });
    return [];
  }
}
