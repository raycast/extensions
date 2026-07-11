import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

type Input = {
  /**
   * Period to get planning for: "this_month" or "this_year"
   * @default "this_month"
   */
  period?: "this_month" | "this_year";
};

export default async function getPlanning(input: Input) {
  const today = new Date();
  const period = input.period || "this_month";

  // Calculate date range
  const from =
    period === "this_month" ? format(startOfMonth(today), "yyyy-MM-dd") : format(startOfYear(today), "yyyy-MM-dd");
  const to = period === "this_month" ? format(endOfMonth(today), "yyyy-MM-dd") : format(endOfYear(today), "yyyy-MM-dd");
  const periodLabel = period === "this_month" ? format(today, "MMMM yyyy") : format(today, "yyyy");

  try {
    const planning = await toshl.getPlanning({ from, to });

    const formatAmount = (amount: number) => {
      const absAmount = Math.abs(amount);
      if (absAmount >= 1000000) return `${(absAmount / 1000000).toFixed(1)}M`;
      if (absAmount >= 1000) return `${(absAmount / 1000).toFixed(0)}k`;
      return absAmount.toFixed(0);
    };

    return {
      period: periodLabel,
      dateRange: { from, to },
      averages: {
        expenses: formatAmount(planning.avg.expenses),
        incomes: formatAmount(planning.avg.incomes),
        balance: `${planning.avg.balance >= 0 ? "+" : ""}${formatAmount(planning.avg.balance)}`,
        networth: formatAmount(planning.avg.networth),
      },
      periods: planning.planning.map((p) => ({
        from: p.from,
        to: p.to,
        expenses: {
          actual: formatAmount(p.expenses.sum),
          planned: formatAmount(p.expenses.planned),
          predicted: formatAmount(p.expenses.predicted),
        },
        incomes: {
          actual: formatAmount(p.incomes.sum),
          planned: formatAmount(p.incomes.planned),
          predicted: formatAmount(p.incomes.predicted),
        },
        balance: {
          actual: `${p.balance.sum >= 0 ? "+" : ""}${formatAmount(p.balance.sum)}`,
          planned: formatAmount(p.balance.planned),
          predicted: formatAmount(p.balance.predicted),
        },
      })),
      _instructions: AI_INSTRUCTIONS,
    };
  } catch (e) {
    const error = e as { response?: { status?: number } };
    if (error.response?.status === 403) {
      return {
        error: "Planning is a Pro feature. This account needs to upgrade to access planning data.",
        _instructions: AI_INSTRUCTIONS,
      };
    }
    throw e;
  }
}
