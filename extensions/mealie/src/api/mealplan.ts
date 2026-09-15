import type { MealieClient, PaginatedResponse } from "./client";
import type { MealPlanEntry, PlanEntryType } from "../types";

const PLANS = "/api/households/mealplans";

export async function getMealPlan(client: MealieClient, startDate: string, endDate: string): Promise<MealPlanEntry[]> {
  const response = await client.get<PaginatedResponse<MealPlanEntry>>(PLANS, {
    start_date: startDate,
    end_date: endDate,
    page: 1,
    perPage: 200,
  });
  return response?.items ?? [];
}

export interface MealPlanInput {
  date: string;
  entryType: PlanEntryType;
  recipeId?: string | null;
  title?: string;
}

export function createMealPlanEntry(client: MealieClient, input: MealPlanInput): Promise<MealPlanEntry> {
  return client.post<MealPlanEntry>(PLANS, {
    date: input.date,
    entryType: input.entryType,
    recipeId: input.recipeId ?? null,
    title: input.recipeId ? "" : (input.title ?? ""),
    text: "",
  });
}

export function updateMealPlanEntry(
  client: MealieClient,
  entry: MealPlanEntry,
  changes: Partial<MealPlanInput>,
): Promise<MealPlanEntry> {
  return client.put<MealPlanEntry>(PLANS + "/" + entry.id, {
    id: entry.id,
    date: changes.date ?? entry.date,
    entryType: changes.entryType ?? entry.entryType,
    recipeId: changes.recipeId !== undefined ? changes.recipeId : entry.recipeId,
    title: changes.title ?? entry.title ?? "",
    text: entry.text ?? "",
  });
}

export function deleteMealPlanEntry(client: MealieClient, id: number): Promise<void> {
  return client.del(PLANS + "/" + id);
}
