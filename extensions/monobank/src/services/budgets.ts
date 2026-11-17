import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { STORAGE_KEYS } from "../data/constants";
import { Budget, MoveDirection, Transaction } from "../types";
import { readJson, writeJson } from "./storage";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Whether a value read from storage is a `Budget`. Ones saved before corrections existed have no `added`/`excluded`. */
function isBudget(value: unknown): value is Budget {
  if (typeof value !== "object" || value === null) return false;
  const { id, name, categories, limit, added, excluded } = value as Partial<Record<keyof Budget, unknown>>;
  return (
    typeof id === "string" &&
    typeof name === "string" &&
    isStringArray(categories) &&
    typeof limit === "number" &&
    Number.isFinite(limit) &&
    (added === undefined || isStringArray(added)) &&
    (excluded === undefined || isStringArray(excluded))
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

/** A budget to save. Without `id`, a new one is created. Corrections aren't part of it, so saving keeps them. */
export type BudgetInput = Omit<Budget, "id" | "added" | "excluded"> & { id?: string };

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
  const current = input.id ? budgets.find((other) => other.id === input.id) : undefined;
  const budget: Budget = {
    id: input.id ?? randomUUID(),
    name: input.name.trim(),
    categories: [...new Set(input.categories)],
    limit: input.limit,
    ...(current?.added && { added: current.added }),
    ...(current?.excluded && { excluded: current.excluded }),
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

/** Whether a budget counts a transaction (`counted`), for `setTransactionBudgets`. */
export interface TransactionBudgetChange {
  budgetId: string;
  counted: boolean;
}

/**
 * Makes each budget in `changes` count `transaction` or not, with the fewest corrections: an id is only `added` when
 * the budget's categories don't count it, and only `excluded` when they do. Budgets deleted in the meantime are
 * skipped. Reads storage again and writes once, like `upsertBudget`.
 */
export async function setTransactionBudgets(transaction: Transaction, changes: TransactionBudgetChange[]) {
  const budgets = await readBudgets();
  const next = budgets.map((budget) => {
    const change = changes.find((item) => item.budgetId === budget.id);
    if (!change) return budget;

    const { id } = transaction;
    const isInCategories = budget.categories.includes(transaction.category.name);
    const added = (budget.added ?? []).filter((other) => other !== id);
    const excluded = (budget.excluded ?? []).filter((other) => other !== id);
    if (change.counted && !isInCategories) added.push(id);
    if (!change.counted && isInCategories) excluded.push(id);
    return { ...budget, added, excluded };
  });
  await writeBudgets(next);
}

/** Removes every transaction added to or excluded from the budget with `id`. */
export async function clearBudgetCorrections(id: string) {
  const budgets = await readBudgets();
  await writeBudgets(budgets.map((budget) => (budget.id === id ? { ...budget, added: [], excluded: [] } : budget)));
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
