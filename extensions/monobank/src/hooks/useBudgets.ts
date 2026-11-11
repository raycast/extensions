import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BudgetInput,
  deleteBudget,
  moveBudget,
  readBudgetAccountIds,
  readBudgets,
  upsertBudget,
  writeBudgetAccountIds,
} from "../services/budgets";
import { AccountType, Budget, MoveDirection } from "../types";
import { isBudgetEligible, resolveBudgetAccounts } from "../utils/budgets";
import { useClientInfo } from "./useClientInfo";

/**
 * Every `useBudgets` in the command reloads after any of them writes, so the statement summary underneath an
 * open "Manage Budgets" view is up to date when the user goes back.
 */
const listeners = new Set<() => void>();

function notifyChange() {
  listeners.forEach((listener) => listener());
}

/** The saved budgets. Writes go through storage (see `upsertBudget`), then every `useBudgets` reads it again. */
export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    function load() {
      readBudgets()
        .then((budgets) => {
          if (!isCancelled) setBudgets(budgets);
        })
        .catch(console.error)
        .finally(() => {
          if (!isCancelled) setIsLoading(false);
        });
    }

    load();
    listeners.add(load);
    return () => {
      isCancelled = true;
      listeners.delete(load);
    };
  }, []);

  const save = useCallback(async (input: BudgetInput) => {
    const budget = await upsertBudget(input);
    notifyChange();
    return budget;
  }, []);

  const remove = useCallback(async (budget: Budget) => {
    await deleteBudget(budget.id);
    notifyChange();
  }, []);

  const move = useCallback(async (budget: Budget, direction: MoveDirection) => {
    await moveBudget(budget.id, direction);
    notifyChange();
  }, []);

  return { budgets, isLoading, save, remove, move };
}

/** Like `listeners`, for the accounts budgets count. */
const accountListeners = new Set<() => void>();

/**
 * The accounts budgets count, from the cached accounts and the saved choice. `accounts` is `undefined` until both
 * are read, so a default selection isn't loaded in place of a saved one. `eligible` is every account that can be
 * chosen: UAH cards and FOP accounts, in the order of the account dropdown.
 */
export function useBudgetAccounts() {
  const { data: clientInfo, isLoading: isLoadingClientInfo, isLoadingFromStorage, tokenError } = useClientInfo();
  const [savedIds, setSavedIds] = useState<string[]>();
  const [isLoadingIds, setIsLoadingIds] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    function load() {
      readBudgetAccountIds()
        .then((ids) => {
          if (!isCancelled) setSavedIds(ids);
        })
        .catch(console.error)
        .finally(() => {
          if (!isCancelled) setIsLoadingIds(false);
        });
    }

    load();
    accountListeners.add(load);
    return () => {
      isCancelled = true;
      accountListeners.delete(load);
    };
  }, []);

  const eligible = useMemo(() => {
    const cards = clientInfo.accounts.filter((account) => account.type !== AccountType.FOP);
    const fops = clientInfo.accounts.filter((account) => account.type === AccountType.FOP);
    return [...cards, ...fops].filter(isBudgetEligible);
  }, [clientInfo.accounts]);

  const isReady = !isLoadingIds && !isLoadingFromStorage;
  const accounts = useMemo(
    () => (isReady ? resolveBudgetAccounts(eligible, savedIds) : undefined),
    [isReady, eligible, savedIds],
  );

  const save = useCallback(async (ids: string[]) => {
    await writeBudgetAccountIds(ids);
    accountListeners.forEach((listener) => listener());
  }, []);

  const reset = useCallback(async () => {
    await writeBudgetAccountIds(undefined);
    accountListeners.forEach((listener) => listener());
  }, []);

  return {
    accounts,
    eligible,
    /** Whether the user chose the accounts, rather than counting the default ones. */
    isCustom: savedIds !== undefined,
    isLoading: !isReady || isLoadingClientInfo,
    tokenError,
    save,
    reset,
  };
}
