import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { STORAGE_KEYS } from "../data/constants";
import { Budget, MoveDirection } from "../types";
import { readJson, writeJson } from "./storage";

/** Whether a value read from storage is a `Budget`. */
function isBudget(value: unknown): value is Budget {
  if (typeof value !== "object" || value === null) return false;
  const { id, name, categories, limit } = value as Partial<Record<keyof Budget, unknown>>;
  return (
    typeof id === "string" &&
    typeof name === "string" &&
    Array.isArray(categories) &&
    categories.every((category) => typeof category === "string") &&
    typeof limit === "number" &&
    Number.isFinite(limit)
  );
}

/** The saved budgets in their order. Invalid entries are left out. */
export async function readBudgets(): Promise<Budget[]> {
  const stored = await readJson<unknown>(STORAGE_KEYS.budgets);
  return Array.isArray(stored) ? stored.filter(isBudget) : [];
}

export async function writeBudgets(budgets: Budget[]) {
  await writeJson(STORAGE_KEYS.budgets, budgets);
}

/** A budget to save. Without `id`, a new one is created. */
export type BudgetInput = Omit<Budget, "id"> & { id?: string };

/** The budget with id `nameOrId`, else the one named `nameOrId` (case-insensitive). */
export function findBudget(budgets: Budget[], nameOrId: string) {
  const name = nameOrId.trim().toLowerCase();
  return (
    budgets.find((budget) => budget.id === nameOrId) ?? budgets.find((budget) => budget.name.toLowerCase() === name)
  );
}

/**
 * Creates a budget, or replaces the one with the same `id`. Storage is read again first, so a budget that another
 * command or an AI tool saved in the meantime isn't lost. Throws when another budget has the same name.
 */
export async function upsertBudget(input: BudgetInput): Promise<Budget> {
  const budgets = await readBudgets();
  const budget: Budget = {
    id: input.id ?? randomUUID(),
    name: input.name.trim(),
    categories: [...new Set(input.categories)],
    limit: input.limit,
  };

  const duplicate = budgets.find(
    (other) => other.id !== budget.id && other.name.toLowerCase() === budget.name.toLowerCase(),
  );
  if (duplicate) throw new Error(`A budget named "${duplicate.name}" already exists`);

  const index = budgets.findIndex((other) => other.id === budget.id);
  const next = index === -1 ? [...budgets, budget] : budgets.map((other, i) => (i === index ? budget : other));
  await writeBudgets(next);
  return budget;
}

/** Deletes the budget with `id`, if it still exists. */
export async function deleteBudget(id: string) {
  const budgets = await readBudgets();
  await writeBudgets(budgets.filter((budget) => budget.id !== id));
}

/** Swaps the budget with `id` with its neighbor in `direction`. */
export async function moveBudget(id: string, direction: MoveDirection) {
  const budgets = await readBudgets();
  const index = budgets.findIndex((budget) => budget.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= budgets.length) return;

  [budgets[index], budgets[target]] = [budgets[target], budgets[index]];
  await writeBudgets(budgets);
}

/**
 * The ids of the accounts budgets count, or `undefined` when the user hasn't chosen: the default ones are counted
 * then (see `resolveBudgetAccounts`), so a new UAH card counts without choosing again.
 */
export async function readBudgetAccountIds(): Promise<string[] | undefined> {
  const stored = await readJson<unknown>(STORAGE_KEYS.budgetAccounts);
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : undefined;
}

/** Saves the accounts budgets count. `undefined` goes back to the default ones. */
export async function writeBudgetAccountIds(ids: string[] | undefined) {
  if (ids === undefined) {
    await LocalStorage.removeItem(STORAGE_KEYS.budgetAccounts);
  } else {
    await writeJson(STORAGE_KEYS.budgetAccounts, ids);
  }
}
