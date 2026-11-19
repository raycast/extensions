export function recipeWebUrl(baseUrl: string, groupSlug: string, slug: string): string {
  return baseUrl + "/g/" + groupSlug + "/r/" + slug;
}

export function shoppingListWebUrl(baseUrl: string, groupSlug: string, listId: string): string {
  return baseUrl + "/g/" + groupSlug + "/shopping-lists/" + listId;
}

/**
 * Mealie liefert im Feld `image` entweder ein kurzes Token, `null` oder den
 * Literalwert "no image". Alle drei Fälle sind in echten Daten belegt.
 */
export function recipeImageUrl(baseUrl: string, recipe: { id: string; image: string | null }): string | undefined {
  const token = recipe.image?.trim();
  if (!token || token === "no image") return undefined;
  return baseUrl + "/api/media/recipes/" + recipe.id + "/images/min-original.webp";
}
