import type { MealieClient, PaginatedResponse } from "./client";
import type { RecipeSummary } from "../types";

export async function searchRecipes(client: MealieClient, search: string, perPage = 50): Promise<RecipeSummary[]> {
  const term = search.trim();
  const response = await client.get<PaginatedResponse<RecipeSummary>>("/api/recipes", {
    search: term === "" ? undefined : term,
    page: 1,
    perPage,
  });
  return response?.items ?? [];
}

/**
 * Mealie antwortet auf diesen Endpunkt mit dem reinen Slug als String,
 * nicht mit dem Rezept-Objekt. Verifiziert gegen die OpenAPI-Spec am 2026-09-01.
 */
export function importRecipeFromUrl(client: MealieClient, url: string, includeTags: boolean): Promise<string> {
  return client.post<string>("/api/recipes/create/url", {
    url: url.trim(),
    includeTags,
    includeCategories: false,
  });
}

export function getRecipe(client: MealieClient, slug: string): Promise<RecipeSummary> {
  return client.get<RecipeSummary>("/api/recipes/" + slug);
}
