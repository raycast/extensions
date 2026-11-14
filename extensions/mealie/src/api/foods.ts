import type { MealieClient } from "./client";
import type { IngredientFood } from "../types";

/**
 * Holt alle Foods des Haushalts. In der Referenzinstanz sind das 609 Einträge,
 * die bei perPage=200 in vier Requests geladen sind. Das Ergebnis wird vom
 * aufrufenden Hook gecacht.
 */
export function getAllFoods(client: MealieClient): Promise<IngredientFood[]> {
  return client.getAllPages<IngredientFood>("/api/foods", undefined, 200);
}
