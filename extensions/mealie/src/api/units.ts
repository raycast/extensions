import type { MealieClient } from "./client";
import type { IngredientUnit } from "../types";

export function getAllUnits(client: MealieClient): Promise<IngredientUnit[]> {
  return client.getAllPages<IngredientUnit>("/api/units", undefined, 200);
}
