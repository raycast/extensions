import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toTransaction } from "../api/mappers";
import { ApiError, getStatement, getTokenError, requireToken } from "../api/monobank";
import {
  RequestMode,
  StoredStatement,
  getPeriodGaps,
  getPeriodItems,
  planRequest,
  TimeRange,
  readStoredStatement,
  saveResponse,
} from "../services/statement";
import { STATEMENT_PAGE_SIZE } from "../data/constants";
import { AccountOrJar, Period } from "../types";
import { formatDateRange, resolvePeriod } from "../utils/statement";
import { CancelledError, withRateLimit } from "./rateLimit";
import { useJarTitles } from "./useClientInfo";
import { notifyStatementsChanged, subscribeToStatements } from "./useAccountStatements";

/**
 * The statement of `account` for `period`. Nothing is loaded while either is `undefined`.
 *
 * Each account has one stored statement, and a period is shown by filtering it. A period within the last 31 days
 * resyncs all 31 days once the last sync is older than monobank's 60-second rate limit; an older period is fetched
 * once. Requests are spaced to respect that limit across launches, with a countdown toast while waiting.
 */
export function useStatement(account: AccountOrJar | undefined, period: Period | undefined) {
  const { token } = getPreferenceValues<Preferences>();
  const [stored, setStored] = useState<{ accountId: string; statement: StoredStatement }>();
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<unknown>();
  const [waitSeconds, setWaitSeconds] = useState(0);
  const jarTitles = useJarTitles();
  // Incremented by every load and on unmount. A load whose number is no longer current stops waiting.
  const generation = useRef(0);
  // The request of the current load, so an identical one isn't sent again while it runs.
  const pendingRequest = useRef<string | undefined>(undefined);
  const accountId = useRef(account?.id);
  accountId.current = account?.id;

  const resolvedPeriod = useMemo(() => period && resolvePeriod(period), [period]);
  const statement = account && stored?.accountId === account.id ? stored.statement : undefined;
  const isLoadingStored = !!account && !statement;

  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  useEffect(() => {
    if (!account) return;

    let isCancelled = false;
    readStoredStatement(account.id).then(
      (statement) => {
        if (!isCancelled) setStored({ accountId: account.id, statement });
      },
      (error) => {
        console.error(error);
        if (!isCancelled) setError(error);
      },
    );

    // Reads it again after another view stored it, e.g. "Manage Budgets…" updating every budget account.
    const unsubscribe = subscribeToStatements((changedId) => {
      if (changedId !== account.id) return;
      readStoredStatement(account.id).then((statement) => {
        if (!isCancelled) setStored({ accountId: account.id, statement });
      }, console.error);
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [account?.id]);

  const load = useCallback(
    async (mode: RequestMode) => {
      if (!account || !resolvedPeriod || !statement) return;

      const request = planRequest(statement, resolvedPeriod, mode, Date.now());
      if (!request) {
        if (mode === "auto") {
          // Stop waiting for a request this period doesn't need.
          generation.current++;
          pendingRequest.current = undefined;
          setIsFetching(false);
          setWaitSeconds(0);
          setError(undefined);
        }
        return;
      }

      // E.g. switching between periods of the last 31 days while their sync is waiting.
      const requestKey = `${account.id}:${request.from}-${request.to ?? "now"}`;
      if (mode === "auto" && pendingRequest.current === requestKey) return;

      const current = ++generation.current;
      const isCurrent = () => generation.current === current;
      pendingRequest.current = requestKey;

      setIsFetching(true);
      setError(undefined);

      try {
        // Token problems are reported right away, without waiting for the rate limit.
        requireToken(token);

        const page = await withRateLimit(
          () => getStatement(token, account.id, request.from, request.to),
          isCurrent,
          setWaitSeconds,
        );

        // Stored even if a newer load has started, since the request has already been spent.
        const next = await saveResponse(account.id, request, page, Date.now());
        if (accountId.current === account.id) setStored({ accountId: account.id, statement: next });
        notifyStatementsChanged(account.id);

        // Says how far it got, since the totals don't cover the period yet.
        const gap = isCurrent() ? getPeriodGaps(next, resolvedPeriod, Date.now())[0] : undefined;
        if (gap) {
          const limit = page.length >= STATEMENT_PAGE_SIZE ? "up to 500 transactions" : "up to 31 days";
          showToast({
            style: Toast.Style.Failure,
            title: "Not all transactions loaded",
            message: `${formatDateRange(gap.from, gap.to)} isn't loaded yet. monobank sends ${limit} at a time.`,
            primaryAction: {
              title: "Load Older Transactions",
              onAction: (toast) => {
                toast.hide();
                // The latest `load`, so it plans from the statement this load just stored.
                loadRef.current("older");
              },
            },
          });
        }
      } catch (error) {
        if (error instanceof CancelledError || !isCurrent()) return;

        setError(error);

        if (getTokenError(error)) {
          console.error(error);
        } else {
          showFailureToast(error, {
            title: "Failed to load statement",
            ...(error instanceof ApiError && error.description && { message: error.description }),
          });
        }
      } finally {
        if (isCurrent()) {
          pendingRequest.current = undefined;
          setIsFetching(false);
          setWaitSeconds(0);
        }
      }
    },
    [token, account?.id, resolvedPeriod, statement],
  );
  const loadRef = useRef(load);
  loadRef.current = load;

  // Loads what the account and period need when either changes.
  useEffect(() => {
    if (isLoadingStored || !resolvedPeriod) return;
    load("auto");
  }, [account?.id, resolvedPeriod?.key, isLoadingStored]);

  const tokenError = getTokenError(error);

  const transactions = useMemo(() => {
    // Without a token monobank accepts, stored data can't be confirmed to belong to the user.
    if (!account || !statement || !resolvedPeriod || tokenError) return [];
    return getPeriodItems(statement, resolvedPeriod).map((item) => toTransaction(item, account.currency, jarTitles));
  }, [account, statement, resolvedPeriod, tokenError, jarTitles]);

  // The newest part of the period that isn't loaded: "Load Older Transactions" loads it next.
  const missing = useMemo<TimeRange | undefined>(
    () => (statement && resolvedPeriod ? getPeriodGaps(statement, resolvedPeriod, Date.now())[0] : undefined),
    [statement, resolvedPeriod],
  );

  return {
    transactions,
    /** The resolved period, for titles. */
    period: resolvedPeriod,
    isLoading: isLoadingStored || isFetching,
    error,
    tokenError,
    /** Whether the period has older transactions that aren't loaded yet. */
    hasMore: !tokenError && !isFetching && !!missing,
    /** The newest part of the period that isn't loaded yet (unix seconds), while `hasMore`. */
    missing: !tokenError && !isFetching ? missing : undefined,
    loadOlder: useCallback(() => load("older"), [load]),
    refresh: useCallback(() => load("refresh"), [load]),
    /** Loads what the period needs again, e.g. after it failed. */
    retry: useCallback(() => load("auto"), [load]),
    /** Seconds left until the rate limit allows the next request, or 0 when not waiting. */
    waitSeconds,
  };
}
