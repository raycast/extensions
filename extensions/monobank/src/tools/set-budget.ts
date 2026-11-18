import { Tool } from "@raycast/api";
import { budgetPresets, findPreset } from "../data/budgetPresets";
import { BudgetInput, findBudget, readBudgets, upsertBudget } from "../services/budgets";
import { Budget } from "../types";
import { formatHryvnias } from "../utils/budgets";
import { findSimilarCategories, getCategoryNamesForCodes, isKnownMcc, resolveCategoryNames } from "../utils/mcc";

type Input = {
  /**
   * The budget's name. An existing budget with this name (case-insensitive) is updated; otherwise a new one is
   * created. Name it after what the user said, in their language, e.g. "Кафе" or "Taxi", or after the preset.
   */
  name: string;
  /** The monthly limit in UAH (гривні), e.g. 5000. Required for a new budget; left out, an update keeps the limit. */
  limit?: number;
  /**
   * A ready-made set of categories: "Cafes & Restaurants", "Groceries", "Taxi", "Transport", "Car", "Health",
   * "Clothes & Shoes", "Subscriptions & Games", "Entertainment", "Beauty" or "Pets". Prefer it when it fits.
   */
  preset?: string;
  /** Category names in English or Ukrainian, e.g. ["Cafe. Restaurants"] or ["Таксі"], as in `byCategory` of `get-transactions`. */
  categories?: string[];
  /** Merchant Category Codes whose categories to include, e.g. [4121] for taxi. */
  mccCodes?: number[];
};

/**
 * Create a monthly budget (a spending limit in UAH for some categories), or change an existing one by name.
 * Categories come from `preset`, `categories` and `mccCodes` together; a new budget needs at least one. On update,
 * passing any of them replaces the categories (pass the current ones too to add one), and leaving all out keeps
 * them. The user confirms before it's saved. Budgets count the cards chosen in "Show Budgets" (by default, all
 * personal UAH cards) together.
 */
export default async function tool(input: Input) {
  const { existing, budget } = await resolveInput(input);
  const saved = await upsertBudget(budget);

  return {
    created: !existing,
    // Without the corrections: transaction ids mean nothing here.
    budget: { id: saved.id, name: saved.name, categories: saved.categories, limit: saved.limit },
    note: 'Budgets count the cards chosen in "Show Budgets", together. The user can see it there and in the Summary of "Show Statement" for This Month.',
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  let resolved: Awaited<ReturnType<typeof resolveInput>>;
  try {
    resolved = await resolveInput(input);
  } catch {
    // Nothing would be saved: the tool reports the error itself.
    return undefined;
  }

  const { existing, budget } = resolved;
  const limit =
    existing && existing.limit !== budget.limit
      ? `${formatHryvnias(existing.limit)} → ${formatHryvnias(budget.limit)}`
      : formatHryvnias(budget.limit);

  return {
    message: existing ? `Update the "${existing.name}" budget?` : `Create a "${budget.name}" budget?`,
    info: [
      { name: "Monthly Limit", value: limit },
      { name: "Categories", value: budget.categories.join(", ") },
    ],
  };
};

async function resolveInput(input: Input): Promise<{ existing?: Budget; budget: BudgetInput }> {
  const name = input.name?.trim();
  if (!name) throw new Error("`name` is required.");

  const existing = findBudget(await readBudgets(), name);

  const preset = input.preset ? findPreset(input.preset) : undefined;
  if (input.preset && !preset) {
    throw new Error(
      `No preset is named "${input.preset}". Presets: ${budgetPresets.map((preset) => preset.name).join(", ")}.`,
    );
  }

  const categories = new Set(preset?.categories);

  for (const text of input.categories ?? []) {
    const names = resolveCategoryNames(text);
    if (!names.length) {
      const similar = findSimilarCategories(text);
      throw new Error(
        `No category is named "${text}".` +
          (similar.length ? ` Similar categories: ${similar.join(", ")}.` : " Pass `mccCodes` instead."),
      );
    }
    names.forEach((name) => categories.add(name));
  }

  const unknownCodes = (input.mccCodes ?? []).filter((code) => !isKnownMcc(code));
  if (unknownCodes.length) throw new Error(`Unknown MCC codes: ${unknownCodes.join(", ")}.`);
  getCategoryNamesForCodes(input.mccCodes ?? []).forEach((name) => categories.add(name));

  const finalCategories = categories.size ? [...categories] : existing?.categories;
  if (!finalCategories?.length) {
    throw new Error("A new budget needs categories: pass `preset`, `categories` or `mccCodes`.");
  }

  const limit = input.limit ?? existing?.limit;
  if (limit === undefined) throw new Error("A new budget needs `limit`, the monthly limit in UAH.");
  if (!Number.isFinite(limit) || limit <= 0) throw new Error("`limit` must be a number above 0, in UAH.");

  return {
    existing,
    budget: {
      id: existing?.id,
      name: existing?.name ?? name,
      limit: Math.round(limit * 100) / 100,
      categories: finalCategories,
    },
  };
}
