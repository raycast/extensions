import { useCachedPromise } from "@raycast/utils";
import { getAllFoods } from "../api/foods";
import type { MealieClient } from "../api/client";
import type { IngredientFood } from "../types";

/**
 * Lädt alle Foods einmal und cacht sie. Gefiltert wird clientseitig, weil
 * Mealies Suche token-basiert ist und "Basmatireis" nicht bei "Reis" findet.
 */
export function useFoods(client?: MealieClient) {
  const { data, isLoading, revalidate } = useCachedPromise(() => getAllFoods(client!), [], {
    execute: client !== undefined,
    initialData: [] as IngredientFood[],
    keepPreviousData: true,
  });
  return { foods: data, isLoading, revalidate };
}
