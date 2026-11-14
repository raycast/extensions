import { Action, Tool } from "@raycast/api";
import { deleteBudget, findBudget, readBudgets } from "../services/budgets";
import { formatHryvnias } from "../utils/budgets";

type Input = {
  /** The name of the budget to delete, as `get-budgets` returns it (case-insensitive). */
  name: string;
};

/** Delete one of the user's monthly budgets by name. The user confirms first. */
export default async function tool(input: Input) {
  const budget = await findInput(input);
  await deleteBudget(budget.id);
  return { deleted: budget.name };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const budget = await findInput(input).catch(() => undefined);
  // Nothing would be deleted: the tool reports the error itself.
  if (!budget) return undefined;

  return {
    style: Action.Style.Destructive,
    message: `Delete the "${budget.name}" budget?`,
    info: [
      { name: "Monthly Limit", value: formatHryvnias(budget.limit) },
      { name: "Categories", value: budget.categories.join(", ") },
    ],
  };
};

async function findInput(input: Input) {
  const budgets = await readBudgets();
  const budget = findBudget(budgets, input.name ?? "");
  if (!budget) {
    throw new Error(
      budgets.length
        ? `No budget is named "${input.name}". Budgets: ${budgets.map((budget) => budget.name).join(", ")}.`
        : "The user has no budgets.",
    );
  }
  return budget;
}
