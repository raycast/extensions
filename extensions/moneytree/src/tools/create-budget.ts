import { saveBudgetForTool } from "../lib/budgets";

type Input = {
  /** Existing Moneytree expense category ID from get-categories. */
  categoryId: number;
  /** Positive whole-number category budget amount in JPY. */
  amount: number;
};

/** Create a saved Moneytree category budget after the user explicitly requests it. */
export default async function tool(input: Input) {
  return saveBudgetForTool("create", input.categoryId, input.amount);
}
