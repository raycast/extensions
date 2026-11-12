import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toTransaction } from "../api/mappers";
import { ApiError, getStatement, getTokenError, requireToken } from "../api/monobank";
import { BUDGET_SYNC_MAX_AGE } from "../data/constants";
import {
  RequestMode,
  StoredStatement,
  getPeriodGaps,
  getPeriodItems,
  planRequest,
  readStoredStatement,
  saveResponse,
} from "../services/statement";
import { Account, Period, Transaction } from "../types";
import { getStatementItemTitle } from "../utils/accounts";
import { resolvePeriod } from "../utils/statement";
import { CancelledError, withRateLimit } from "./rateLimit";
import { useJarTitles } from "./useClientInfo";

/**
 * Called with an account's id after its stored statement changes, so every view showing it in the command reads it
 * again, e.g. the Summary of "Show Statement" after "Manage Budgets…" updated the other cards.
 */
const statementListeners = new Set<(accountId: string) => void>();

export function notifyStatementsChanged(accountId: string) {
  statementListeners.forEach((listener) => listener(accountId));
}

/** Calls `listener` whenever a stored statement changes. Returns the unsubscribe function. */
export function subscribeToStatements(listener: (accountId: string) => void) {
  statementListeners.add(listener);
  return () => {
    statementListeners.delete(listener);
  };
}

/** The transactions of one account in the period. */
export interface AccountStatementGroup {
  account: Account;
  /** Transactions in the period, newest first. */
  transactions: Transaction[];
  /** Unix milliseconds of the account's last sync, or 0 when it was never synced. */
  syncedAt: number;
  /** Whether the period has transactions of this account that aren't loaded. */
  incomplete: boolean;
  /** Unix seconds: where the transactions run without gaps to the end of the period (its start when complete). */
  loadedSince: number;
}

/**
 * The statements of `accounts` for `period`, e.g. for budgets or subscriptions. Nothing is loaded while either is
 * `undefined`.
 *
 * The stored statements show at once. With `sync`, each account whose statement is older than
 * `BUDGET_SYNC_MAX_AGE` (or misses part of the period) is then updated, one request at a time and the stalest
 * first, with a toast showing the progress. Without it, nothing is requested until `refresh`.
 *
 * `label` names what is updated in the toasts, e.g. "budgets" for "Updating budgets".
 */
export function useAccountStatements(
  accounts: Account[] | undefined,
  period: Period | undefined,
  { sync = false, label = "budgets" }: { sync?: boolean; label?: string } = {},
) {
  const { token } = getPreferenceValues<Preferences>();
  const [stored, setStored] = useState<{ key: string; statements: Record<string, StoredStatement> }>();
  const jarTitles = useJarTitles();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<unknown>();
  // Incremented by every sync, when the accounts or period change, and on unmount. A sync whose number is no
  // longer current stops before its next request.
  const generation = useRef(0);

  const resolvedPeriod = useMemo(() => period && resolvePeriod(period), [period]);
  const accountIds = accounts?.map((account) => account.id).join(",");
  const loadKey = accounts && resolvedPeriod ? `${accountIds}|${resolvedPeriod.key}` : undefined;
  const statements = loadKey && stored?.key === loadKey ? stored.statements : undefined;

  // The latest values, for listeners and syncs that outlive a render.
  const latest = useRef({ accounts, loadKey });
  latest.current = { accounts, loadKey };

  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  const runSync = useCallback(
    async (mode: RequestMode) => {
      if (!accounts?.length || !resolvedPeriod || !loadKey) return;

      const current = ++generation.current;
      const isCurrent = () => generation.current === current;
      setError(undefined);

      let toast: Toast | undefined;
      try {
        // Token problems are reported right away, without waiting for the rate limit.
        requireToken(token);

        const now = Date.now();
        const queue = (await Promise.all(accounts.map((account) => readStoredStatement(account.id))))
          .map((statement, index) => ({
            account: accounts[index],
            syncedAt: statement.syncedAt,
            request: planRequest(statement, resolvedPeriod, mode, now, BUDGET_SYNC_MAX_AGE),
          }))
          .filter((item) => item.request !== undefined)
          .sort((a, b) => a.syncedAt - b.syncedAt);

        if (!queue.length || !isCurrent()) return;
        setIsSyncing(true);

        for (const [index, { account, request }] of queue.entries()) {
          if (!isCurrent() || !request) throw new CancelledError();

          const progress = queue.length > 1 ? ` · ${index + 1} of ${queue.length}` : "";
          toast = await showToast({ style: Toast.Style.Animated, title: `Updating ${label}${progress}` });

          const page = await withRateLimit(
            () => getStatement(token, account.id, request.from, request.to),
            isCurrent,
            () => undefined,
            `Updating ${getStatementItemTitle(account)}${progress}`,
          );

          // Stored even if the sync was replaced, since the request has already been spent.
          const next = await saveResponse(account.id, request, page, Date.now());
          if (latest.current.loadKey === loadKey) {
            setStored((prev) =>
              prev?.key === loadKey ? { key: loadKey, statements: { ...prev.statements, [account.id]: next } } : prev,
            );
          }
          notifyStatementsChanged(account.id);
        }
      } catch (error) {
        if (error instanceof CancelledError || !isCurrent()) return;

        setError(error);

        if (getTokenError(error)) {
          console.error(error);
        } else {
          // Hides the progress toast before the failure shows.
          await toast?.hide();
          toast = undefined;
          await showFailureToast(error, {
            title: `Failed to update ${label}`,
            ...(error instanceof ApiError && error.description && { message: error.description }),
          });
        }
      } finally {
        if (isCurrent()) setIsSyncing(false);
        await toast?.hide();
      }
    },
    [token, accountIds, resolvedPeriod?.key, loadKey, label],
  );

  // Reads the stored statements when the accounts or the period change, then syncs them with `sync`.
  useEffect(() => {
    if (!accounts || !resolvedPeriod || !loadKey) return;

    // Stops a sync of other accounts or another period.
    generation.current++;
    setIsSyncing(false);

    let isCancelled = false;
    Promise.all(accounts.map((account) => readStoredStatement(account.id))).then(
      (list) => {
        if (isCancelled) return;
        setStored({ key: loadKey, statements: Object.fromEntries(list.map((s, i) => [accounts[i].id, s])) });
        if (sync) runSync("auto");
      },
      (error) => {
        console.error(error);
        if (!isCancelled) setError(error);
      },
    );

    return () => {
      isCancelled = true;
    };
  }, [loadKey]);

  // Reads an account again after another view (or a sync in this one) stored a newer statement.
  useEffect(
    () =>
      subscribeToStatements((accountId) => {
        const { accounts, loadKey } = latest.current;
        if (!loadKey || !accounts?.some((account) => account.id === accountId)) return;

        readStoredStatement(accountId).then((statement) => {
          if (latest.current.loadKey !== loadKey) return;
          setStored((prev) =>
            prev?.key === loadKey ? { key: loadKey, statements: { ...prev.statements, [accountId]: statement } } : prev,
          );
        }, console.error);
      }),
    [],
  );

  const tokenError = getTokenError(error);

  const groups = useMemo((): AccountStatementGroup[] => {
    if (!accounts || !resolvedPeriod || !statements) return [];
    const now = Date.now();

    return accounts.flatMap((account) => {
      const statement = statements[account.id];
      if (!statement) return [];
      // A period that ends in the future (e.g. at the end of today) is checked until the last sync, like one that
      // runs until now: transactions since then are new, not missing.
      const isOngoing = resolvedPeriod.to === undefined || resolvedPeriod.to * 1000 >= now;
      const gaps = getPeriodGaps(
        statement,
        { from: resolvedPeriod.from, to: isOngoing ? undefined : resolvedPeriod.to },
        now,
      );
      return [
        {
          account,
          // Without a token monobank accepts, stored data can't be confirmed to belong to the user.
          transactions: tokenError
            ? []
            : getPeriodItems(statement, resolvedPeriod).map((item) => toTransaction(item, account.currency, jarTitles)),
          syncedAt: statement.syncedAt,
          incomplete: gaps.length > 0,
          loadedSince: gaps[0] ? gaps[0].to + 1 : resolvedPeriod.from,
        },
      ];
    });
  }, [accounts, resolvedPeriod, statements, tokenError, jarTitles]);

  const oldestSyncedAt = groups.length ? Math.min(...groups.map((group) => group.syncedAt)) : undefined;

  return {
    groups,
    isLoading: (!!loadKey && !statements) || isSyncing,
    /** Whether any account has transactions in the period that aren't loaded. */
    isPartial: !tokenError && !isSyncing && groups.some((group) => group.incomplete),
    /** Unix milliseconds of the least recent sync among the accounts (0 when one was never synced). */
    oldestSyncedAt,
    error,
    tokenError,
    refresh: useCallback(() => runSync("refresh"), [runSync]),
  };
}
