import { usePromise } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BudgetInput,
  TransactionBudgetChange,
  clearBudgetCorrections,
  deleteBudget,
  moveBudget,
  readBudgetAccountIds,
  readBudgets,
  setTransactionBudgets,
  upsertBudget,
  writeBudgetAccountIds,
} from "../services/budgets";
import { purgeListeners } from "../services/owner";
import { AccountType, Budget, MoveDirection, Transaction } from "../types";
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

/** Calls the latest `revalidate` whenever a listener in `set` is notified. */
function useListener(set: Set<() => void>, revalidate: () => unknown) {
  const latest = useRef(revalidate);
  latest.current = revalidate;

  useEffect(() => {
    const listener = () => {
      latest.current();
    };
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }, [set]);
}

/** The saved budgets. Writes go through storage (see `upsertBudget`), then every `useBudgets` reads it again. */
export function useBudgets() {
  const { data, isLoading, revalidate } = usePromise(readBudgets, [], {
    failureToastOptions: { title: "Failed to load budgets" },
  });
  useListener(listeners, revalidate);
  useListener(purgeListeners, revalidate);
  const budgets = useMemo(() => data ?? [], [data]);

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

  const setTransaction = useCallback(async (transaction: Transaction, changes: TransactionBudgetChange[]) => {
    await setTransactionBudgets(transaction, changes);
    notifyChange();
  }, []);

  const clearCorrections = useCallback(async (budget: Budget) => {
    await clearBudgetCorrections(budget.id);
    notifyChange();
  }, []);

  return { budgets, isLoading, save, remove, move, setTransactionBudgets: setTransaction, clearCorrections };
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
  // Wrapped, so "nothing saved" (`undefined` ids) can be told apart from "not read yet".
  const saved = usePromise(async () => ({ ids: await readBudgetAccountIds() }), [], {
    failureToastOptions: { title: "Failed to load budget accounts" },
  });
  useListener(accountListeners, saved.revalidate);
  useListener(purgeListeners, saved.revalidate);
  const savedIds = saved.data?.ids;
  // Ready once read, and still ready while it's read again after a change. A failed read counts the default ones.
  const isLoadingIds = !saved.data && !saved.error;

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
