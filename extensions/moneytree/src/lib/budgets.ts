import { getBudgets, getCategories, putBudget, removeBudget, type Budget, type SpendingPeriod } from "./api";
import type { Category } from "./types";

export type BudgetWithCategory = Budget & { category: Category };

type BudgetAction = "create" | "update" | "delete";

export function validateAmount(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error("Budget amount must be a positive whole number of yen");
  return value;
}

export async function getBudgetContext(): Promise<{ budgets: Budget[]; categories: Category[] }> {
  const [budgets, categories] = await Promise.all([getBudgets(), getCategories()]);
  return { budgets, categories };
}

export function getSpendingPeriodDates(date: Date): { startDate: string; endDate: string } {
  const format = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  return {
    startDate: format(new Date(date.getFullYear(), date.getMonth() - 1, 1)),
    endDate: format(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

export function getAverageSpendingPeriodDates(date: Date): { startDate: string; endDate: string } {
  const start = new Date(date.getFullYear(), date.getMonth() - 12, 1);
  const end = new Date(date.getFullYear(), date.getMonth(), 0);
  const format = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  return { startDate: format(start), endDate: format(end) };
}

/**
 * Moneytree budgets are independent per category: a parent's budget does not include its subcategories' spending
 * (verified against the Moneytree app), so only the budget's own category counts.
 */
export function getBudgetProgress(
  budget: Budget,
  periods: SpendingPeriod[],
  date: Date,
): { spent: number; percent: number } | undefined {
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  const period = periods.find((item) => item.start_date === month);
  if (!period || !period.categories || typeof period.categories !== "object" || Array.isArray(period.categories))
    return undefined;
  if (!Number.isSafeInteger(budget.amount) || budget.amount <= 0) return undefined;
  const value = period.categories[String(budget.category_id)] ?? 0;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  // Expense amounts are negative; an unexpected positive value must not appear as zero spending.
  if (value > 0) return undefined;
  const spent = Math.max(0, -value);
  return { spent, percent: (spent / budget.amount) * 100 };
}

/** Budgets never overlap, so totals are plain sums; spending is omitted if any budget's spending is unavailable. */
export function getBudgetTotals(
  budgets: Budget[],
  periods: SpendingPeriod[] | undefined,
  date: Date,
): { limit: number; spent?: number } {
  const limit = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  if (!periods || !budgets.length) return { limit };
  const spent = budgets.map((budget) => getBudgetProgress(budget, periods, date)?.spent);
  return spent.every((value) => value !== undefined)
    ? { limit, spent: spent.reduce<number>((sum, value) => sum + value!, 0) }
    : { limit };
}

/** Average over the 12 most recent completed calendar months, never the partial current month. */
export function getAverageMonthlySpending(budget: Budget, periods: SpendingPeriod[], date: Date): number | undefined {
  const spent = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(date.getFullYear(), date.getMonth() - index - 1, 1);
    return getBudgetProgress(budget, periods, month)?.spent;
  });
  return spent.every((value) => value !== undefined)
    ? spent.reduce<number>((sum, value) => sum + value!, 0) / 12
    : undefined;
}

export type BudgetFilter = "all" | "over" | "near";
export type BudgetSort = "percent" | "spent" | "limit" | "name";

export const BUDGET_SORT_LABELS: Record<BudgetSort, string> = {
  percent: "Most Used (%)",
  spent: "Most Spent (¥)",
  limit: "Highest Limit",
  name: "Name",
};

export function organizeBudgets(
  budgets: BudgetWithCategory[],
  periods: SpendingPeriod[] | undefined,
  date: Date,
  filter: BudgetFilter,
  sort: BudgetSort,
): BudgetWithCategory[] {
  const progress = new Map(
    budgets.map((budget) => [budget.category_id, periods && getBudgetProgress(budget, periods, date)]),
  );
  return budgets
    .filter((budget) => {
      const percent = progress.get(budget.category_id)?.percent;
      if (filter === "over") return percent !== undefined && percent >= 100;
      if (filter === "near") return percent !== undefined && percent >= 75 && percent < 100;
      return true;
    })
    .sort((a, b) => {
      if (sort === "limit" && a.amount !== b.amount) return b.amount - a.amount;
      if (sort === "percent") {
        const aPercent = progress.get(a.category_id)?.percent;
        const bPercent = progress.get(b.category_id)?.percent;
        if (aPercent !== bPercent) return (bPercent ?? -1) - (aPercent ?? -1);
      }
      if (sort === "spent") {
        const aSpent = progress.get(a.category_id)?.spent;
        const bSpent = progress.get(b.category_id)?.spent;
        if (aSpent !== bSpent) return (bSpent ?? -1) - (aSpent ?? -1);
      }
      return a.category.name.localeCompare(b.category.name) || a.category_id - b.category_id;
    });
}

export function describeBudgets(budgets: Budget[], categories: Category[]): BudgetWithCategory[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return budgets.flatMap((budget) => {
    const category = byId.get(budget.category_id);
    if (!category) return [];
    return [{ ...budget, category }];
  });
}

export function assertBudgetAction(
  action: BudgetAction,
  categoryId: number,
  budgets: Budget[],
  categories: Category[],
  amount?: number,
): Category {
  if (!Number.isSafeInteger(categoryId) || categoryId <= 0) throw new Error("Choose a valid category ID");
  const category = categories.find((item) => item.id === categoryId);
  if (!category) throw new Error(`Category #${categoryId} was not found`);
  if (category.category_type !== "expense") throw new Error("Budgets can only be assigned to expense categories");
  const existing = budgets.find((budget) => budget.category_id === categoryId);
  if (action === "create" && existing) throw new Error(`${category.name} already has a budget; edit it instead`);
  if (action !== "create" && !existing) throw new Error(`${category.name} has no budget; refresh the list`);
  if (action !== "delete") validateAmount(amount as number);
  return category;
}

/** Verify each change against a fresh read, rather than trusting the response to a write. */
export async function changeBudget(
  action: BudgetAction,
  categoryId: number,
  amount?: number,
): Promise<(Budget & { categoryName: string }) | null> {
  const { budgets, categories } = await getBudgetContext();
  const category = assertBudgetAction(action, categoryId, budgets, categories, amount);
  if (action === "delete") await removeBudget(categoryId);
  else await putBudget(categoryId, amount as number);
  const refreshed = await getBudgets();
  const saved = refreshed.find((budget) => budget.category_id === categoryId);
  if (action === "delete") {
    if (saved)
      throw new Error("Delete request completed, but the budget still appears; check Moneytree before retrying");
    return null;
  }
  if (!saved || saved.amount !== amount)
    throw new Error(
      "Save request completed, but the expected budget was not returned; check Moneytree before retrying",
    );
  return { ...saved, categoryName: category.name };
}

/** Build the same verified AI-tool result for create and update without fetching the context again. */
export async function saveBudgetForTool(action: "create" | "update", categoryId: number, amount: number) {
  const saved = await changeBudget(action, categoryId, amount);
  if (!saved) throw new Error("Budget save returned no result");
  return { categoryId, categoryName: saved.categoryName, amount: saved.amount, verified: true };
}
