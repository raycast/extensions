import type { IngredientFood } from "../types";

export function normalizeForSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Substring-Match statt Token-Match, damit "reis" auch "Basmatireis" findet.
 * Treffer am Wortanfang werden vor Treffern in der Wortmitte einsortiert.
 */
export function filterFoods(foods: IngredientFood[], term: string, limit = 100): IngredientFood[] {
  const needle = normalizeForSearch(term);
  if (!needle) return foods.slice(0, limit);

  const scored: { food: IngredientFood; score: number }[] = [];
  for (const food of foods) {
    const index = normalizeForSearch(food.name).indexOf(needle);
    if (index === -1) continue;
    scored.push({ food, score: index });
  }

  scored.sort((a, b) => a.score - b.score || a.food.name.localeCompare(b.food.name, "de"));
  return scored.slice(0, limit).map((entry) => entry.food);
}
