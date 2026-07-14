/**
 * React hook for portfolio CRUD operations via LocalStorage.
 *
 * This is the central state management hook for the entire extension.
 * All components that need to read or modify portfolio data should use this hook.
 *
 * Responsibilities:
 * - Loads portfolio from LocalStorage on mount
 * - Provides the current portfolio state to consumers
 * - Exposes mutation functions for accounts and positions
 * - Handles loading and error states
 * - Ensures all mutations are persisted immediately
 *
 * Design:
 * - Uses `useCachedPromise` from @raycast/utils for async loading with caching
 * - All mutation functions follow the pattern: update state → persist → revalidate
 * - Mutations are optimistic: the UI updates immediately, then persists in background
 * - Each mutation returns the updated portfolio for chaining if needed
 *
 * IMPORTANT — Fresh-read pattern for mutations:
 * Every mutation reads the latest portfolio from LocalStorage via `await loadPortfolio()`
 * rather than using the `portfolio` value from the React closure. This is critical
 * because Raycast navigation `push()` freezes the props/callbacks of pushed views.
 * When a user adds a position, pops back to search, and adds another, the `addPosition`
 * closure captured by the pushed SearchInvestmentsView still holds the pre-first-add
 * portfolio. Reading from storage on every mutation guarantees we always operate on
 * the latest persisted state, preventing data loss from stale closures.
 *
 * The `optimisticUpdate` callbacks still receive the correct in-memory state from
 * `useCachedPromise`, so the UI remains responsive. Only the storage write path
 * is affected — it always reads fresh before writing.
 */

import { useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  Portfolio,
  Account,
  Position,
  AccountType,
  AssetType,
  MortgageData,
  DebtData,
  isPropertyAssetType,
} from "../utils/types";
import { loadPortfolio, savePortfolio } from "../utils/storage";
import { getDisplayName } from "../utils/formatting";
import { generateId } from "../utils/uuid";
import { resetCachedBalance } from "../services/debt-repayments";

// ──────────────────────────────────────────
// Return Type
// ──────────────────────────────────────────

export interface UsePortfolioReturn {
  /** Current portfolio state (undefined while loading) */
  portfolio: Portfolio | undefined;

  /** Whether the initial load is in progress */
  isLoading: boolean;

  /** Force a reload from LocalStorage */
  revalidate: () => void;

  // ── Account Mutations ──

  /** Creates a new account and adds it to the portfolio */
  addAccount: (name: string, type: AccountType) => Promise<Account>;

  /** Updates an existing account's name and/or type */
  updateAccount: (accountId: string, updates: { name?: string; type?: AccountType }) => Promise<void>;

  /** Removes an account and all its positions */
  removeAccount: (accountId: string) => Promise<void>;

  // ── Position Mutations ──

  /** Adds a new position to a specific account */
  addPosition: (
    accountId: string,
    params: {
      symbol: string;
      name: string;
      units: number;
      currency: string;
      assetType: AssetType;
      debtData?: DebtData;
    },
  ) => Promise<Position>;

  /** Updates the units of an existing position */
  updatePosition: (accountId: string, positionId: string, units: number) => Promise<void>;

  /**
   * Updates a property position's mortgage data, asset type, and/or name.
   * Used by EditMortgageForm to persist changes to MORTGAGE / OWNED_PROPERTY positions.
   */
  updatePropertyPosition: (
    accountId: string,
    positionId: string,
    updates: {
      name?: string;
      customName?: string;
      assetType?: AssetType;
      mortgageData?: MortgageData;
    },
  ) => Promise<void>;

  /**
   * Updates a debt position's debt data, asset type, and/or name.
   * Used by EditDebtForm to persist changes to debt positions.
   */
  updateDebtPosition: (
    accountId: string,
    positionId: string,
    updates: {
      name?: string;
      customName?: string;
      assetType?: AssetType;
      debtData?: DebtData;
    },
  ) => Promise<void>;

  /**
   * Toggles the archived state of a debt position.
   * Archived positions are hidden from the default portfolio view
   * and excluded from totals.
   */
  archiveDebtPosition: (accountId: string, positionId: string) => Promise<void>;

  /** Sets a custom display name for a position (rename) */
  renamePosition: (accountId: string, positionId: string, customName: string) => Promise<void>;

  /** Removes the custom name, restoring the original Yahoo Finance name */
  restorePositionName: (accountId: string, positionId: string) => Promise<void>;

  /** Removes a position from an account */
  removePosition: (accountId: string, positionId: string) => Promise<void>;

  /**
   * Renames multiple positions in a single atomic operation.
   * Always loads fresh from LocalStorage to avoid stale closure issues.
   * Used by BatchRenameForm after the original asset has already been saved.
   */
  batchRenamePositions: (
    renames: Array<{ accountId: string; positionId: string; customName: string }>,
  ) => Promise<void>;

  // ── Bulk Operations ──

  /** Merges pre-built accounts (with their own IDs) into the portfolio */
  mergeAccounts: (accounts: Account[]) => Promise<void>;

  /** Returns a flat array of all positions across all accounts */
  getAllPositions: () => Position[];

  /** Returns all unique symbols in the portfolio */
  getAllSymbols: () => string[];

  /** Returns all unique currencies held in the portfolio */
  getAllCurrencies: () => string[];

  /** Finds an account by ID */
  getAccount: (accountId: string) => Account | undefined;
}

// ──────────────────────────────────────────
// Hook Implementation
// ──────────────────────────────────────────

export function usePortfolio(): UsePortfolioReturn {
  const {
    data: portfolio,
    isLoading,
    revalidate,
    mutate,
  } = useCachedPromise(loadPortfolio, [], {
    // Keep previous data while revalidating to avoid UI flicker
    keepPreviousData: true,
  });

  // ── Account Mutations ──────────────────

  const addAccount = useCallback(
    async (name: string, type: AccountType): Promise<Account> => {
      const newAccount: Account = {
        id: generateId(),
        name: name.trim(),
        type,
        createdAt: new Date().toISOString(),
        positions: [],
      };

      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: [...current.accounts, newAccount],
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: [...currentData.accounts, newAccount],
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Account Created",
        message: name.trim(),
      });

      return newAccount;
    },
    [mutate],
  );

  const updateAccount = useCallback(
    async (accountId: string, updates: { name?: string; type?: AccountType }): Promise<void> => {
      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === accountId
                ? {
                    ...account,
                    ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
                    ...(updates.type !== undefined ? { type: updates.type } : {}),
                  }
                : account,
            ),
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: currentData.accounts.map((account) =>
                account.id === accountId
                  ? {
                      ...account,
                      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
                      ...(updates.type !== undefined ? { type: updates.type } : {}),
                    }
                  : account,
              ),
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Account Updated",
      });
    },
    [mutate],
  );

  const removeAccount = useCallback(
    async (accountId: string): Promise<void> => {
      // Read the account name from fresh storage before mutating (for the toast)
      const fresh = await loadPortfolio();
      const accountName = fresh.accounts.find((a) => a.id === accountId)?.name ?? "Account";

      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: current.accounts.filter((a) => a.id !== accountId),
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: currentData.accounts.filter((a) => a.id !== accountId),
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Account Removed",
        message: accountName,
      });
    },
    [mutate],
  );

  // ── Position Mutations ─────────────────

  const addPosition = useCallback(
    async (
      accountId: string,
      params: {
        symbol: string;
        name: string;
        units: number;
        currency: string;
        assetType: AssetType;
        priceOverride?: number;
        mortgageData?: MortgageData;
        debtData?: DebtData;
      },
    ): Promise<Position> => {
      const newPosition: Position = {
        id: generateId(),
        symbol: params.symbol,
        name: params.name,
        units: params.units,
        currency: params.currency,
        assetType: params.assetType,
        priceOverride: params.priceOverride,
        ...(params.mortgageData && { mortgageData: params.mortgageData }),
        ...(params.debtData && { debtData: params.debtData }),
        addedAt: new Date().toISOString(),
      };

      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === accountId ? { ...account, positions: [...account.positions, newPosition] } : account,
            ),
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: currentData.accounts.map((account) =>
                account.id === accountId ? { ...account, positions: [...account.positions, newPosition] } : account,
              ),
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Position Added",
        message: `${params.units} × ${params.name}`,
      });

      return newPosition;
    },
    [mutate],
  );

  const updatePosition = useCallback(
    async (accountId: string, positionId: string, units: number): Promise<void> => {
      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === accountId
                ? {
                    ...account,
                    positions: account.positions.map((pos) => (pos.id === positionId ? { ...pos, units } : pos)),
                  }
                : account,
            ),
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: currentData.accounts.map((account) =>
                account.id === accountId
                  ? {
                      ...account,
                      positions: account.positions.map((pos) => (pos.id === positionId ? { ...pos, units } : pos)),
                    }
                  : account,
              ),
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Position Updated",
        message: `Units set to ${units}`,
      });
    },
    [mutate],
  );

  const updatePropertyPosition = useCallback(
    async (
      accountId: string,
      positionId: string,
      updates: {
        name?: string;
        customName?: string;
        assetType?: AssetType;
        mortgageData?: MortgageData;
      },
    ): Promise<void> => {
      const applyUpdates = (pos: Position): Position => {
        if (pos.id !== positionId) return pos;
        return {
          ...pos,
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.customName !== undefined ? { customName: updates.customName } : {}),
          ...(updates.assetType !== undefined && { assetType: updates.assetType }),
          ...(updates.mortgageData !== undefined && { mortgageData: updates.mortgageData }),
          // Update symbol if postcode changed and it's a property type
          ...(updates.mortgageData?.postcode && isPropertyAssetType(updates.assetType ?? pos.assetType)
            ? { symbol: `PROPERTY:${updates.mortgageData.postcode.replace(/\s+/g, "").toUpperCase()}` }
            : {}),
        };
      };

      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === accountId ? { ...account, positions: account.positions.map(applyUpdates) } : account,
            ),
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: currentData.accounts.map((account) =>
                account.id === accountId ? { ...account, positions: account.positions.map(applyUpdates) } : account,
              ),
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );

      const posName = updates.customName ?? updates.name ?? "Property";
      await showToast({
        style: Toast.Style.Success,
        title: "Property Updated",
        message: posName,
      });
    },
    [mutate],
  );

  const updateDebtPosition = useCallback(
    async (
      accountId: string,
      positionId: string,
      updates: {
        name?: string;
        customName?: string;
        assetType?: AssetType;
        debtData?: DebtData;
      },
    ): Promise<void> => {
      const applyUpdates = (pos: Position): Position => {
        if (pos.id !== positionId) return pos;
        return {
          ...pos,
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.customName !== undefined ? { customName: updates.customName } : {}),
          ...(updates.assetType !== undefined && { assetType: updates.assetType }),
          ...(updates.debtData !== undefined && { debtData: updates.debtData }),
        };
      };

      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === accountId ? { ...account, positions: account.positions.map(applyUpdates) } : account,
            ),
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);

          // Reset the repayment log's cached balance when the debt data is manually
          // edited so the next sync starts from the new currentBalance rather than
          // the stale cachedBalance from a previous automatic sync.
          if (updates.debtData !== undefined) {
            await resetCachedBalance(positionId, updates.debtData.currentBalance);
          }

          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: currentData.accounts.map((account) =>
                account.id === accountId ? { ...account, positions: account.positions.map(applyUpdates) } : account,
              ),
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );
      // Note: toast is shown by the EditDebtForm after onSave resolves — no duplicate here.
    },
    [mutate],
  );

  const archiveDebtPosition = useCallback(
    async (accountId: string, positionId: string): Promise<void> => {
      const applyArchive = (pos: Position): Position => {
        if (pos.id !== positionId || !pos.debtData) return pos;
        return {
          ...pos,
          debtData: {
            ...pos.debtData,
            archived: !pos.debtData.archived,
          },
        };
      };

      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === accountId ? { ...account, positions: account.positions.map(applyArchive) } : account,
            ),
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: currentData.accounts.map((account) =>
                account.id === accountId ? { ...account, positions: account.positions.map(applyArchive) } : account,
              ),
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );

      // Determine the new state to show the right toast
      const fresh = await loadPortfolio();
      const pos = fresh.accounts.find((a) => a.id === accountId)?.positions.find((p) => p.id === positionId);
      const isNowArchived = pos?.debtData?.archived ?? false;
      const posName = pos ? getDisplayName(pos) : "Debt";

      await showToast({
        style: Toast.Style.Success,
        title: isNowArchived ? "Debt Archived" : "Debt Unarchived",
        message: posName,
      });
    },
    [mutate],
  );

  const renamePosition = useCallback(
    async (accountId: string, positionId: string, customName: string): Promise<void> => {
      const trimmed = customName.trim();
      if (!trimmed) return;

      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === accountId
                ? {
                    ...account,
                    positions: account.positions.map((pos) =>
                      pos.id === positionId ? { ...pos, customName: trimmed } : pos,
                    ),
                  }
                : account,
            ),
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: currentData.accounts.map((account) =>
                account.id === accountId
                  ? {
                      ...account,
                      positions: account.positions.map((pos) =>
                        pos.id === positionId ? { ...pos, customName: trimmed } : pos,
                      ),
                    }
                  : account,
              ),
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Asset Renamed",
        message: trimmed,
      });
    },
    [mutate],
  );

  const restorePositionName = useCallback(
    async (accountId: string, positionId: string): Promise<void> => {
      // Read the original name from fresh storage before mutating (for the toast)
      const fresh = await loadPortfolio();
      const originalName =
        fresh.accounts.find((a) => a.id === accountId)?.positions.find((p) => p.id === positionId)?.name ?? "Asset";

      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === accountId
                ? {
                    ...account,
                    positions: account.positions.map((pos) => {
                      if (pos.id === positionId) {
                        // Remove customName by destructuring it out
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { customName, ...rest } = pos;
                        return rest;
                      }
                      return pos;
                    }),
                  }
                : account,
            ),
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: currentData.accounts.map((account) =>
                account.id === accountId
                  ? {
                      ...account,
                      positions: account.positions.map((pos) => {
                        if (pos.id === positionId) {
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          const { customName, ...rest } = pos;
                          return rest;
                        }
                        return pos;
                      }),
                    }
                  : account,
              ),
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Name Restored",
        message: originalName,
      });
    },
    [mutate],
  );

  const batchRenamePositions = useCallback(
    async (renames: Array<{ accountId: string; positionId: string; customName: string }>): Promise<void> => {
      if (renames.length === 0) return;

      await mutate(
        (async () => {
          // Always load fresh from LocalStorage — never use the stale `portfolio`
          // closure. This is critical: the original asset's rename was saved to
          // storage moments ago, and we must read that updated state before
          // applying the batch renames on top.
          const current = await loadPortfolio();

          let accounts = current.accounts;
          for (const rename of renames) {
            const trimmed = rename.customName.trim();
            if (!trimmed) continue;

            accounts = accounts.map((account) =>
              account.id === rename.accountId
                ? {
                    ...account,
                    positions: account.positions.map((pos) =>
                      pos.id === rename.positionId ? { ...pos, customName: trimmed } : pos,
                    ),
                  }
                : account,
            );
          }

          const updated: Portfolio = {
            ...current,
            accounts,
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Assets Renamed",
        message: `${renames.length} position${renames.length === 1 ? "" : "s"} updated`,
      });
    },
    [mutate], // No `portfolio` dependency — always loads fresh from storage
  );

  const removePosition = useCallback(
    async (accountId: string, positionId: string): Promise<void> => {
      // Read the position name from fresh storage before mutating (for the toast)
      const fresh = await loadPortfolio();
      const position = fresh.accounts.find((a) => a.id === accountId)?.positions.find((p) => p.id === positionId);
      const positionName = position ? getDisplayName(position) : "Position";

      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === accountId
                ? {
                    ...account,
                    positions: account.positions.filter((p) => p.id !== positionId),
                  }
                : account,
            ),
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: currentData.accounts.map((account) =>
                account.id === accountId
                  ? {
                      ...account,
                      positions: account.positions.filter((p) => p.id !== positionId),
                    }
                  : account,
              ),
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Position Removed",
        message: positionName,
      });
    },
    [mutate],
  );

  // ── Bulk Operations ─────────────────────

  const mergeAccounts = useCallback(
    async (accounts: Account[]): Promise<void> => {
      await mutate(
        (async () => {
          const current = await loadPortfolio();
          const updated: Portfolio = {
            ...current,
            accounts: [...current.accounts, ...accounts],
            updatedAt: new Date().toISOString(),
          };
          await savePortfolio(updated);
          return updated;
        })(),
        {
          optimisticUpdate(currentData) {
            if (!currentData) return currentData;
            return {
              ...currentData,
              accounts: [...currentData.accounts, ...accounts],
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );
    },
    [mutate],
  );

  // ── Query Helpers ──────────────────────

  const getAllPositions = useCallback((): Position[] => {
    if (!portfolio) return [];
    return portfolio.accounts.flatMap((account) => account.positions);
  }, [portfolio]);

  const getAllSymbols = useCallback((): string[] => {
    if (!portfolio) return [];
    const symbols = new Set<string>();
    for (const account of portfolio.accounts) {
      for (const position of account.positions) {
        symbols.add(position.symbol);
      }
    }
    return [...symbols];
  }, [portfolio]);

  const getAllCurrencies = useCallback((): string[] => {
    if (!portfolio) return [];
    const currencies = new Set<string>();
    for (const account of portfolio.accounts) {
      for (const position of account.positions) {
        currencies.add(position.currency);
      }
    }
    return [...currencies];
  }, [portfolio]);

  const getAccount = useCallback(
    (accountId: string): Account | undefined => {
      return portfolio?.accounts.find((a) => a.id === accountId);
    },
    [portfolio],
  );

  // ── Return ─────────────────────────────

  return {
    portfolio,
    isLoading,
    revalidate,
    addAccount,
    updateAccount,
    removeAccount,
    addPosition,
    updatePosition,
    updatePropertyPosition,
    updateDebtPosition,
    archiveDebtPosition,
    renamePosition,
    restorePositionName,
    batchRenamePositions,
    removePosition,
    mergeAccounts,
    getAllPositions,
    getAllSymbols,
    getAllCurrencies,
    getAccount,
  };
}
