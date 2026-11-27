import { getAuthProvider } from "../lib/auth";
import { getMealsMenu } from "../lib/api/meals";
import { mealsAccountKey } from "../lib/meals/drafts";
import { createDraft, draftIssues } from "../lib/meals/planning";
import { fillMealDraft, loadMealPlanner } from "../lib/meals/service";

interface Input {
  /** Which menu to read. Defaults to target, the server's planning week including administrator overrides. Current and next refer to regular calendar weeks. Use target before preparing a draft. */
  week?: "current" | "next" | "target";
  /** Optional next-week suggestion preview. This never submits meals or changes a draft. */
  suggestions?: "recent" | "popular";
}

export default async function getMealMenu(input: Input) {
  const session = await getAuthProvider().getSession();
  const week = input.week ?? "target";
  const planner = await loadMealPlanner(mealsAccountKey(session.subject));
  const menu =
    week === "target"
      ? planner.nextWeekPlan
        ? { ...planner.nextWeekPlan, items: planner.options }
        : null
      : await getMealsMenu(week);
  const rules = planner.rules;
  let suggestedDraft = null;
  if (input.suggestions) {
    if (week === "current" || !menu || menu.id !== planner.nextWeekPlan?.id)
      throw new Error("Quick-fill is available only for the regular next-week target menu.");
    const draft = await fillMealDraft(createDraft(menu, planner.myNextSelection), input.suggestions);
    suggestedDraft = { days: draft.days, warnings: draft.warnings, issues: draftIssues(draft, menu.items, rules) };
  }
  return {
    menu,
    compatibilityRules: rules,
    suggestedDraft,
    selectionWindow: planner.windowStatus,
    expectedSavedAt: planner.myNextSelection?.submitted_at ?? "",
    note: "Preview only. Complete dishes cannot have sides. For other mains a side is optional, must be compatible, and must be offered that day. Never invent meal IDs, dietary labels or a submission result.",
  };
}
