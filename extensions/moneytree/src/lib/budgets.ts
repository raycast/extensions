import { getBudgets, getCategories, putBudget, removeBudget, type Budget } from "./api";
import type { Category } from "./types";

export type BudgetWithCategory = Budget & { category: Category; parentName?: string };

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

export function describeBudgets(budgets: Budget[], categories: Category[]): BudgetWithCategory[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return budgets.flatMap((budget) => {
    const category = byId.get(budget.category_id);
    if (!category) return [];
    return [{ ...budget, category, parentName: category.parent_id ? byId.get(category.parent_id)?.name : undefined }];
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
