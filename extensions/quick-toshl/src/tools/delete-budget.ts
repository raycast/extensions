import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Input = {
  /** Budget id from get-budgets or Toshl app. */
  budgetId: string;
};

export default async function deleteBudget(input: Input) {
  await toshl.deleteBudget(input.budgetId.trim());
  return {
    success: true,
    message: "Budget deleted.",
    _instructions: AI_INSTRUCTIONS,
  };
}
