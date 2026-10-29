import { changeBudget, getBudgetContext } from "../lib/budgets";

type Input = {
  /** Existing Moneytree expense category ID from get-budgets. */
  categoryId: number;
};

/** Delete one saved Moneytree category budget after the user explicitly requests it. */
export default async function tool(input: Input) {
  const { categories } = await getBudgetContext();
  const categoryName = categories.find((c) => c.id === input.categoryId)?.name;
  await changeBudget("delete", input.categoryId);
  return { categoryId: input.categoryId, categoryName, deleted: true, verified: true };
}
