import { useMemo } from "react";
import { Period, StatisticsFilters } from "../types";
import { classifyFlows } from "../utils/flows";
import { getJarTitles } from "../utils/savings";
import { getStatistics, getStatisticsAccounts, resolveStatisticsAccountIds } from "../utils/statistics";
import { useAccountStatements } from "./useAccountStatements";
import { useClientInfo } from "./useClientInfo";
import { useCurrencyRates } from "./useCurrencyRates";

/**
 * What "Show Statistics" counts for `period`. The stored statements of all accounts and jars are read once, so both
 * sides of a transfer between the user's accounts are seen and switching an account is only a filter.
 *
 * `accountIds` are the saved ids of the switched-on accounts and `excluded` the switched-off rows, as in
 * `StatisticsFilters`. Nothing loads while `isReady` is false, e.g. until the saved filters are read. With `sync`,
 * the switched-on accounts are then updated when they're stale; without it, nothing is requested until
 * `sync.refresh`.
 */
export function useStatistics(
  period: Period,
  options: { accountIds?: string[]; excluded?: StatisticsFilters["excluded"]; isReady?: boolean; sync?: boolean } = {},
) {
  const { accountIds, excluded, sync: shouldSync = false } = options;
  const clientInfo = useClientInfo();
  const { data: rates } = useCurrencyRates();

  const accounts = useMemo(() => getStatisticsAccounts(clientInfo.data.accounts), [clientInfo.data.accounts]);
  const enabledIds = useMemo(() => resolveStatisticsAccountIds(accounts, accountIds), [accounts, accountIds]);
  // Nothing loads until the cached accounts are read too, so the default accounts aren't updated (and the rate
  // limit spent) in place of the chosen ones.
  const isReady = (options.isReady ?? true) && !clientInfo.isLoadingFromStorage;
  const items = useMemo(
    () => (isReady ? [...accounts, ...clientInfo.data.jars] : undefined),
    [isReady, accounts, clientInfo.data.jars],
  );
  const enabledAccounts = useMemo(
    () => (isReady ? accounts.filter((account) => enabledIds.has(account.id)) : undefined),
    [isReady, accounts, enabledIds],
  );

  // Stored data only. It reads an account again whenever the sync below saves it.
  const statements = useAccountStatements(items, period, { label: "statistics" });
  const sync = useAccountStatements(enabledAccounts, period, { sync: shouldSync, label: "statistics" });

  const jarTitles = useMemo(() => getJarTitles(clientInfo.data), [clientInfo.data]);
  const flows = useMemo(
    () => classifyFlows(statements.groups, { rates, jarTitles }),
    [statements.groups, rates, jarTitles],
  );
  const statistics = useMemo(
    () => getStatistics(statements.groups, flows, { enabledAccountIds: enabledIds, excluded, rates }),
    [statements.groups, flows, enabledIds, excluded, rates],
  );

  return {
    /** The accounts statistics can count, switched on or not. */
    accounts,
    enabledIds,
    /** `undefined` until ready. */
    enabledAccounts,
    /** Of every account and jar. */
    statements,
    /** Of the switched-on accounts: their update, and whether their period is loaded. */
    sync,
    statistics,
    tokenError: clientInfo.tokenError ?? sync.tokenError ?? statements.tokenError,
    /** Why the accounts couldn't be loaded, other than the token. The cached ones are still shown, if any. */
    error: clientInfo.tokenError ? undefined : clientInfo.error,
    /** Requests the accounts again, e.g. after `error`. */
    retry: clientInfo.revalidate,
    isLoading: clientInfo.isLoading || statements.isLoading || sync.isLoading,
  };
}
