import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  mealieUrl: string;
  apiToken: string;
  groupSlug?: string;
  openImportedRecipe?: boolean;
};

export type RecipeSummary = {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  recipeYield?: string | null;
  totalTime?: string | null;
  prepTime?: string | null;
  performTime?: string | null;
  dateAdded?: string | null;
  tags?: Array<{ id?: string; name: string; slug?: string }>;
  recipeCategory?: Array<{ id?: string; name: string; slug?: string }>;
};

export type RecipesResponse = {
  items?: RecipeSummary[];
  page?: number;
  perPage?: number;
  total?: number;
  totalPages?: number;
};

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function baseUrl(): string {
  return prefs().mealieUrl.replace(/\/$/, "");
}

export function groupSlug(): string {
  return (prefs().groupSlug || "home").trim() || "home";
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  return {
    Authorization: `Bearer ${prefs().apiToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extra,
  };
}

export function recipeWebUrl(recipe: Pick<RecipeSummary, "slug">): string {
  return `${baseUrl()}/g/${encodeURIComponent(groupSlug())}/r/${encodeURIComponent(recipe.slug)}`;
}

export function recipeImageUrl(recipe: RecipeSummary): string | undefined {
  if (!recipe.image) return undefined;
  if (recipe.image.startsWith("http://") || recipe.image.startsWith("https://"))
    return recipe.image;
  return `${baseUrl()}${recipe.image.startsWith("/") ? "" : "/"}${recipe.image}`;
}

export async function mealieFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...options,
    headers: authHeaders(options.headers),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Mealie API error ${response.status} ${response.statusText}${body ? `: ${body}` : ""}`,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function getCurrentUser(): Promise<unknown> {
  return mealieFetch<unknown>("/api/users/self");
}

export async function searchRecipes(
  query: string,
  page = 1,
  perPage = 25,
): Promise<RecipeSummary[]> {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
    orderBy: "name",
    orderDirection: "asc",
  });

  if (query.trim()) params.set("search", query.trim());

  const data = await mealieFetch<RecipesResponse | RecipeSummary[]>(
    `/api/recipes?${params.toString()}`,
  );
  return Array.isArray(data) ? data : data.items || [];
}

export async function importRecipeFromUrl(
  url: string,
): Promise<RecipeSummary | { slug?: string; name?: string } | unknown> {
  // Current Mealie endpoint. Some old clients used /api/recipes/create-url; Mealie docs/API use /api/recipes/create/url.
  return mealieFetch<unknown>("/api/recipes/create/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}
