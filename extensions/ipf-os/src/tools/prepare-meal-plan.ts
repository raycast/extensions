import { Action, LaunchType, launchCommand, type Tool } from "@raycast/api";
import { z } from "zod";
import { getAuthProvider } from "../lib/auth";
import { mealsAccountKey, readMealDraft, writeMealDraft } from "../lib/meals/drafts";
import { DAYS, WEEKDAYS, choiceLabel, createDraft, draftIssues, weekLabel } from "../lib/meals/planning";
import { loadMealPlanner } from "../lib/meals/service";
import { mealId, weekday, type DayChoice } from "../lib/meals/schemas";

interface Input {
  /** Exact nextWeekPlan.id returned by get-my-meals. Never guess an ID. */
  weeklyPlanId: string;
  /** Exact expectedSavedAt returned by get-my-meals or get-meal-menu; an empty string means there is no saved target-week selection. */
  expectedSavedAt: string;
  /** All five weekdays. Each day must have a mainMealId or explicitly set skip=true. Copy only IDs offered on that day by get-meal-menu. */
  choices: {
    /** Monday=1 through Friday=5. Include each weekday exactly once. */
    day: number;
    /** Main meal ID from the offered menu. Omit only when skipping. */
    mainMealId?: string;
    /** Optional compatible side ID from the same day's menu. Omit for complete dishes or no side. */
    sideMealId?: string;
    /** Explicitly skip this day. Do not provide meal IDs when true. */
    skip?: boolean;
  }[];
}

const inputSchema = z.object({
  weeklyPlanId: mealId,
  expectedSavedAt: z.string(),
  choices: z
    .array(
      z.object({
        day: weekday,
        mainMealId: mealId.optional(),
        sideMealId: mealId.optional(),
        skip: z.boolean().optional(),
      }),
    )
    .length(5)
    .refine((choices) => new Set(choices.map((choice) => choice.day)).size === 5, "Include every weekday exactly once"),
});

async function prepare(input: Input) {
  const parsed = inputSchema.parse(input);
  const session = await getAuthProvider().getSession();
  const account = mealsAccountKey(session.subject);
  const planner = await loadMealPlanner(account);
  const target = planner.nextWeekPlan;
  if (!target || target.id !== parsed.weeklyPlanId)
    throw new Error("The planning week changed. Read the current Meals context again.");
  if ((planner.myNextSelection?.submitted_at ?? "") !== parsed.expectedSavedAt)
    throw new Error("The saved selection changed. Read it again and ask the user to review the changes.");
  const draft = createDraft(target, planner.myNextSelection);
  draft.days = DAYS.map((day): DayChoice => {
    const choice = parsed.choices.find((choice) => choice.day === day);
    if (!choice) throw new Error("Include every weekday exactly once");
    if (choice.skip) {
      if (choice.mainMealId || choice.sideMealId) throw new Error("A skipped day cannot include meal IDs");
      return { day, state: "skipped", mainId: null, sideId: null };
    }
    if (!choice.mainMealId) throw new Error(`${WEEKDAYS[day - 1]} needs a main meal or an explicit skip`);
    return { day, state: "selected", mainId: choice.mainMealId, sideId: choice.sideMealId ?? null };
  });
  const issues = draftIssues(draft, planner.options, planner.rules);
  if (issues.length) throw new Error(issues.map((issue) => `${WEEKDAYS[issue.day - 1]}: ${issue.message}`).join("\n"));
  return { account, draft, planner };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { account, draft, planner } = await prepare(input);
  const replacingDraft = await readMealDraft(account, draft.planId);
  return {
    style: replacingDraft ? Action.Style.Destructive : Action.Style.Regular,
    message:
      "Prepare this local meal draft? This replaces any existing unsent draft for this week and opens the full review. No meals will be submitted automatically.",
    info: [
      { name: "Week", value: weekLabel(draft.weekStart) },
      ...draft.days.map((day) => ({ name: WEEKDAYS[day.day - 1], value: choiceLabel(day, planner.options) })),
    ],
  };
};

export default async function prepareMealPlan(input: Input) {
  const { account, draft } = await prepare(input);
  await writeMealDraft(account, draft);
  let reviewOpened = true;
  try {
    await launchCommand({ name: "plan-my-meals", type: LaunchType.UserInitiated, context: { review: true } });
  } catch {
    reviewOpened = false;
  }
  return {
    submitted: false,
    draftPrepared: true,
    reviewOpened,
    week: weekLabel(draft.weekStart),
    message: "Draft prepared. Review it in Plan My Meals and explicitly submit there. No meals have been submitted.",
  };
}
