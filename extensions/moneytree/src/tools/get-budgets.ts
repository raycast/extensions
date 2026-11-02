import { getBudgets, getCategories } from "../lib/api";

/**
 * List Moneytree's synced category budget amounts. This is read-only and does not calculate current spending.
 */
export default async function tool() {
  const [budgets, categories] = await Promise.all([getBudgets(), getCategories()]);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return {
    count: budgets.length,
    budgets: budgets.map((budget) => ({
      categoryId: budget.category_id,
      categoryName: categoryById.get(budget.category_id)?.name ?? null,
      amount: budget.amount,
    })),
    note: "These are saved budget limits, not spending or remaining balances.",
  };
}
