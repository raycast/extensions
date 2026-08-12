import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";
import { format, subDays, addDays, isWithinInterval, parseISO } from "date-fns";

type Input = {
  /**
   * Optional: Filter by budget name (partial match)
   */
  name?: string;
};

export default async function getBudgets(input: Input) {
  const today = new Date();
  const sixtyDaysAgo = format(subDays(today, 60), "yyyy-MM-dd");
  const sixtyDaysFromNow = format(addDays(today, 60), "yyyy-MM-dd");

  const budgets = await toshl.getBudgets({ from: sixtyDaysAgo, to: sixtyDaysFromNow });

  // Filter to only current budgets (period includes today)
  const currentBudgets = budgets.filter((b) => {
    if (b.status !== "active") return false;
    try {
      const fromDate = parseISO(b.from);
      const toDate = parseISO(b.to);
      return isWithinInterval(today, { start: fromDate, end: toDate });
    } catch {
      return false;
    }
  });

  // Optional name filter
  const filteredBudgets = input.name
    ? currentBudgets.filter((b) => b.name.toLowerCase().includes(input.name!.toLowerCase()))
    : currentBudgets;

  const budgetData = filteredBudgets.map((b) => ({
    name: b.name,
    spent: b.amount,
    limit: b.limit,
    remaining: b.limit - b.amount,
    progress: `${((b.amount / b.limit) * 100).toFixed(0)}%`,
    currency: b.currency.code,
    period: `${b.from} to ${b.to}`,
    isOverBudget: b.amount > b.limit,
  }));

  return {
    budgets: budgetData,
    _instructions: AI_INSTRUCTIONS,
  };
}
