import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";
import { format, addDays, subDays } from "date-fns";

type Input = {
  budgetId: string;
  name: string;
  limit: string;
  rollover?: boolean;
  /** Which budget iterations to update (Toshl `update` query). Default one. */
  updateMode?: "one" | "tail" | "all";
};

export default async function updateBudget(input: Input) {
  const limit = parseFloat(input.limit);
  if (isNaN(limit) || limit <= 0) {
    return { success: false, message: "Invalid limit.", _instructions: AI_INSTRUCTIONS };
  }
  const today = new Date();
  const from = format(subDays(today, 30), "yyyy-MM-dd");
  const to = format(addDays(today, 120), "yyyy-MM-dd");
  const budgets = await toshl.getBudgets({ from, to });
  const existing = budgets.find((b) => b.id === input.budgetId);
  if (!existing) {
    return { success: false, message: "Budget not found in current window.", _instructions: AI_INSTRUCTIONS };
  }

  await toshl.updateBudget(
    {
      id: existing.id,
      name: input.name.trim(),
      limit,
      type: existing.type,
      currency: existing.currency,
      modified: existing.modified,
      rollover: input.rollover ?? existing.rollover,
      categories: existing.categories,
      tags: existing.tags,
      accounts: existing.accounts,
      ...(existing.type === "percent" && existing.percent != null ? { percent: existing.percent } : {}),
      ...(existing.type === "delta" && existing.delta != null ? { delta: existing.delta } : {}),
    },
    input.updateMode || "one",
  );

  return {
    success: true,
    budgetId: existing.id,
    message: "Budget updated (current iteration).",
    _instructions: AI_INSTRUCTIONS,
  };
}
