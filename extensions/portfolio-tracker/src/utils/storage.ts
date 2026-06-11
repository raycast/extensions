/**
 * LocalStorage wrapper for typed portfolio persistence.
 *
 * Provides a thin, typed abstraction over Raycast's LocalStorage API
 * specifically for portfolio data. All reads/writes go through this module
 * to ensure consistent serialisation and a single source of truth.
 *
 * Design decisions:
 * - The entire portfolio is stored as a single JSON blob under one key.
 *   This keeps reads atomic and avoids partial-state issues.
 * - All functions are async (matching Raycast's LocalStorage API).
 * - Type safety is enforced at the boundary — data is validated on read.
 */

import { LocalStorage } from "@raycast/api";
import { Portfolio, Account } from "./types";
import { STORAGE_KEYS } from "./constants";

// ──────────────────────────────────────────
// Default State
// ──────────────────────────────────────────

/**
 * Returns a fresh, empty portfolio.
 * Used when no data exists in LocalStorage (first launch).
 */
function createEmptyPortfolio(): Portfolio {
  return {
    accounts: [],
    updatedAt: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────
// Read
// ──────────────────────────────────────────

/**
 * Loads the portfolio from LocalStorage.
 *
 * Returns the stored portfolio if it exists and is valid,
 * otherwise returns a fresh empty portfolio.
 *
 * @returns The current portfolio state
 *
 * @example
 * const portfolio = await loadPortfolio();
 * console.log(portfolio.accounts.length); // 0 on first launch
 */
export async function loadPortfolio(): Promise<Portfolio> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.PORTFOLIO);

    if (!raw) {
      return createEmptyPortfolio();
    }

    const parsed = JSON.parse(raw);

    // Basic shape validation — ensure we have the expected structure
    if (!isValidPortfolio(parsed)) {
      console.warn("Stored portfolio data has invalid shape, returning empty portfolio");
      return createEmptyPortfolio();
    }

    return parsed as Portfolio;
  } catch (error) {
    console.error("Failed to load portfolio from LocalStorage:", error);
    return createEmptyPortfolio();
  }
}

// ──────────────────────────────────────────
// Write
// ──────────────────────────────────────────

/**
 * Saves the portfolio to LocalStorage.
 *
 * Automatically updates the `updatedAt` timestamp before saving.
 * The entire portfolio is serialised as a single JSON string.
 *
 * @param portfolio - The portfolio state to persist
 *
 * @example
 * portfolio.accounts.push(newAccount);
 * await savePortfolio(portfolio);
 */
export async function savePortfolio(portfolio: Portfolio): Promise<void> {
  const toSave: Portfolio = {
    ...portfolio,
    updatedAt: new Date().toISOString(),
  };

  await LocalStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(toSave));
}

// ──────────────────────────────────────────
// Clear
// ──────────────────────────────────────────

/**
 * Removes all portfolio data from LocalStorage.
 *
 * ⚠️ Destructive operation — all accounts and positions will be lost.
 * Use only for "reset all data" functionality.
 */
export async function clearPortfolio(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.PORTFOLIO);
}

// ──────────────────────────────────────────
// Convenience Mutations
// ──────────────────────────────────────────

/**
 * Loads the portfolio, applies a mutation function, and saves the result.
 *
 * This is the preferred pattern for all portfolio mutations. It ensures
 * the read-modify-write cycle is atomic (as much as possible in an
 * async environment) and that `updatedAt` is always refreshed.
 *
 * @param mutate - A function that receives the current portfolio and returns the updated one
 * @returns The updated portfolio after the mutation has been saved
 *
 * @example
 * // Add an account
 * const updated = await mutatePortfolio((portfolio) => ({
 *   ...portfolio,
 *   accounts: [...portfolio.accounts, newAccount],
 * }));
 *
 * @example
 * // Remove a position from a specific account
 * const updated = await mutatePortfolio((portfolio) => ({
 *   ...portfolio,
 *   accounts: portfolio.accounts.map((a) =>
 *     a.id === accountId
 *       ? { ...a, positions: a.positions.filter((p) => p.id !== positionId) }
 *       : a
 *   ),
 * }));
 */
export async function mutatePortfolio(mutate: (current: Portfolio) => Portfolio): Promise<Portfolio> {
  const current = await loadPortfolio();
  const updated = mutate(current);
  await savePortfolio(updated);
  return updated;
}

// ──────────────────────────────────────────
// Validation
// ──────────────────────────────────────────

/**
 * Performs basic shape validation on a parsed portfolio object.
 *
 * This is not exhaustive — it checks top-level structure only.
 * Designed to catch corrupted or incompatible data from LocalStorage,
 * not to validate every nested field.
 *
 * @param data - Parsed JSON data from LocalStorage
 * @returns true if the data has the expected portfolio shape
 */
function isValidPortfolio(data: unknown): data is Portfolio {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Must have an accounts array
  if (!Array.isArray(obj.accounts)) {
    return false;
  }

  // Must have an updatedAt string
  if (typeof obj.updatedAt !== "string") {
    return false;
  }

  // Validate each account has basic required fields
  for (const account of obj.accounts) {
    if (!isValidAccount(account)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates the basic shape of an account object.
 *
 * @param data - A single account from the parsed portfolio
 * @returns true if it has the expected account shape
 */
function isValidAccount(data: unknown): data is Account {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.type === "string" &&
    typeof obj.createdAt === "string" &&
    Array.isArray(obj.positions)
  );
}
