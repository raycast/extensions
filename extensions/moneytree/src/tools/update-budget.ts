import { saveBudgetForTool } from "../lib/budgets";

type Input = {
  /** Existing Moneytree expense category ID from get-budgets. */
  categoryId: number;
  /** New positive whole-number budget limit in JPY. */
  amount: number;
};

/** Update an existing saved Moneytree budget after the user explicitly requests it. */
export default async function tool(input: Input) {
  return saveBudgetForTool("update", input.categoryId, input.amount);
}
