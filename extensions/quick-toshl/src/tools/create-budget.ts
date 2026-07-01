import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";
import { format, startOfMonth } from "date-fns";

type Input = {
  name: string;
  limit: string;
  rollover?: boolean;
  currencyCode?: string;
};

export default async function createBudget(input: Input) {
  const limit = parseFloat(input.limit);
  if (isNaN(limit) || limit <= 0) {
    return { success: false, message: "Invalid limit.", _instructions: AI_INSTRUCTIONS };
  }
  const main = await toshl.getDefaultCurrency();
  const today = new Date();
  const b = await toshl.createBudget({
    name: input.name.trim(),
    limit,
    type: "regular",
    currency: { code: input.currencyCode || main },
    rollover: input.rollover ?? false,
    recurrence: {
      frequency: "monthly",
      interval: 1,
      start: format(startOfMonth(today), "yyyy-MM-dd"),
    },
  });
  return {
    success: true,
    budgetId: b.id,
    name: b.name,
    _instructions: AI_INSTRUCTIONS,
  };
}
