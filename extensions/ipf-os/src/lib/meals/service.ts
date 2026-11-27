import { ApiError } from "../api/client";
import {
  getMealCompatibility,
  getMealOptions,
  getMealsDashboard,
  getMealsMenu,
  getMealsProfile,
  getNextMealSelection,
  getPopularMeals,
  getRecentMeals,
  saveMealSelection,
} from "../api/meals";
import { WEEKDAYS, choicesMatch, createDraft, currentMonday, addDays, draftIssues, fingerprint } from "./planning";
import type { DayChoice, MealDraft, MealSelection } from "./schemas";

export async function loadMealsOverview(accountKey: string) {
  const [dashboard, profile, currentMenu, nextMenu, nextSelection] = await Promise.all([
    getMealsDashboard(),
    getMealsProfile(),
    getMealsMenu("current"),
    getMealsMenu("next"),
    getNextMealSelection(),
  ]);
  return { accountKey, dashboard, profile, currentMenu, nextMenu, nextSelection, fetchedAt: new Date().toISOString() };
}
export type MealsOverview = Awaited<ReturnType<typeof loadMealsOverview>>;

export async function loadMealPlanner(accountKey: string) {
  const dashboard = await getMealsDashboard();
  const target = dashboard.nextWeekPlan;
  const [options, rules, profile] = await Promise.all([
    target ? getMealOptions(target.id) : Promise.resolve([]),
    getMealCompatibility(),
    getMealsProfile(),
  ]);
  return { accountKey, ...dashboard, options, rules, profile, fetchedAt: new Date().toISOString() };
}
export type MealPlannerData = Awaited<ReturnType<typeof loadMealPlanner>>;

export async function fillMealDraft(draft: MealDraft, source: "recent" | "popular"): Promise<MealDraft> {
  if (draft.weekStart !== addDays(currentMonday(), 7))
    throw new Error("Quick-fill is available for next week's menu only. Choose this week's meals individually.");
  const next = { ...draft, updatedAt: new Date().toISOString(), warnings: [] };
  if (source === "popular") {
    const result = await getPopularMeals(draft.planId);
    return {
      ...next,
      days: draft.days.map((day): DayChoice => {
        const suggestion = result.selections.find((item) => item.day === day.day);
        return suggestion
          ? { day: day.day, state: "selected", mainId: suggestion.main_id, sideId: suggestion.side_id }
          : { day: day.day, state: "unselected", mainId: null, sideId: null };
      }),
    };
  }
  const result = await getRecentMeals(draft.planId);
  return {
    ...next,
    warnings: result.invalid.map((item) => ({ day: item.day, message: item.reason })),
    days: draft.days.map((day): DayChoice => {
      const suggestion = result.valid.find((item) => item.day === day.day);
      return suggestion
        ? { day: day.day, state: "selected", mainId: suggestion.main.id, sideId: suggestion.side?.id ?? null }
        : { day: day.day, state: "unselected", mainId: null, sideId: null };
    }),
  };
}

export class MealConflictError extends Error {
  constructor(readonly saved: MealSelection | null) {
    super("Your saved plan changed in another client. Review the latest saved plan before replacing it.");
  }
}

export class MealValidationError extends Error {
  constructor(readonly issues: ReturnType<typeof draftIssues>) {
    super(issues.map((issue) => `${WEEKDAYS[issue.day - 1]}: ${issue.message}`).join("\n"));
  }
}

export async function submitMealDraft(draft: MealDraft): Promise<MealSelection> {
  const fresh = await loadMealPlanner("submission");
  if (fresh.nextWeekPlan?.id !== draft.planId)
    throw new Error("The target week changed. Reopen Plan My Meals to review the correct week.");
  if (!fresh.windowStatus.canSubmit) throw new Error(fresh.windowStatus.reason ?? "Meal selection is closed.");
  if (fingerprint(fresh.myNextSelection) !== draft.baseline) throw new MealConflictError(fresh.myNextSelection);
  const issues = draftIssues(draft, fresh.options, fresh.rules);
  if (issues.length) throw new MealValidationError(issues);
  try {
    const saved = await saveMealSelection(draft.planId, draft.days);
    if (!saved) throw new Error("The server did not return a saved selection.");
    return saved;
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) throw error;
    // A lost response can follow a successful write; read before allowing a retry.
    const dashboard = await getMealsDashboard().catch(() => null);
    if (dashboard?.myNextSelection && choicesMatch(draft, dashboard.myNextSelection)) return dashboard.myNextSelection;
    throw new Error(
      "Could not confirm submission. Your draft is safe. Refresh My Meals and check the saved plan before trying again.",
      { cause: error },
    );
  }
}

export function newPlannerDraft(data: MealPlannerData): MealDraft | null {
  return data.nextWeekPlan ? createDraft(data.nextWeekPlan, data.myNextSelection) : null;
}
