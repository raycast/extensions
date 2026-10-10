import { CopyErrorDetails } from "./diagnostics";
import { AccountDetails } from "./account-details";
import { Action, ActionPanel, Detail, environment, Icon, Keyboard } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useRef } from "react";
import { useDetails } from "../hooks/use-details";
import { api } from "../lib/api";
import { balanceHistory, HISTORY_RANGES, type HistoryRange } from "../lib/balance-history";
import { restoreMissingBalances } from "../lib/balances";
import { historyChart } from "../lib/chart";
import { SynciApiError } from "../lib/diagnostics";
import {
  accountBalance,
  accountName,
  accountUrl,
  dateLabel,
  decimal,
  markdown,
  money,
  transactionDate,
  transactionName,
} from "../lib/format";
import { supportsHoldings } from "../lib/holdings";
import { SignInRequiredError } from "../lib/oauth-session";
import type { FinancialAccount } from "../lib/types";
import { CommonActions, ToggleDetailsAction } from "./common";
import { HoldingsList } from "./holdings-list";
import { TransactionList } from "./transaction-list";

type AccountOverviewProps = { account: FinancialAccount; accountId?: never } | { accountId: number; account?: never };

function accountAccessLost(error?: Error) {
  return (
    error instanceof SignInRequiredError || (error instanceof SynciApiError && [401, 403, 404].includes(error.status))
  );
}

export function AccountOverview({ account: initialAccount, accountId }: AccountOverviewProps) {
  const abortable = useRef<AbortController | null>(null);
  // usePromise clears data on failure. Retain the last account only for this open view.
  const lastAccount = useRef(initialAccount);
  const requestedId = accountId ?? initialAccount!.id;
  const { data, error, isLoading, revalidate } = usePromise(
    (id: number) => api.accountSummary(id, abortable.current?.signal),
    [requestedId],
    {
      abortable,
      onData: (account) => {
        lastAccount.current = account;
      },
      onError: (error) => {
        if (accountAccessLost(error)) lastAccount.current = undefined;
      },
    },
  );
  const account = [data, lastAccount.current].find((value) => value?.id === requestedId);
  if (accountAccessLost(error) || !account) {
    const unavailable = error instanceof SynciApiError && [403, 404].includes(error.status);
    return (
      <Detail
        isLoading={isLoading}
        markdown={
          error
            ? unavailable
              ? "# Account Unavailable\n\nThis account is no longer available to Raycast. Reconnect Synci to review account access."
              : `# Couldn't Load Account\n\n${markdown(error.message)}`
            : "# Loading Account…"
        }
        actions={
          error ? (
            <ActionPanel>
              <CopyErrorDetails error={error} />
              <CommonActions refresh={revalidate} />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  }
  return (
    <AccountOverviewContent
      account={account}
      isRefreshing={isLoading}
      refreshAccount={revalidate}
      refreshError={error}
    />
  );
}

function AccountOverviewContent({
  account: initialAccount,
  isRefreshing,
  refreshAccount,
  refreshError,
}: {
  account: FinancialAccount;
  isRefreshing: boolean;
  refreshAccount: () => void;
  refreshError?: Error;
}) {
  const [showDetails, setShowDetails] = useDetails("account-overview", true);
  const [range, setRange] = useCachedState<HistoryRange>("balance-history-range", "30d", {
    cacheNamespace: "synci-views",
  });
  const historyAbort = useRef<AbortController | null>(null);
  const activityAbort = useRef<AbortController | null>(null);
  const history = usePromise(
    (id: number) => api.accountBalanceHistory(id, historyAbort.current?.signal),
    [initialAccount.id],
    { abortable: historyAbort, onError: () => {} },
  );
  const activity = usePromise(
    (id: number) => api.recentTransactions(id, activityAbort.current?.signal),
    [initialAccount.id],
    {
      abortable: activityAbort,
      onError: () => {},
    },
  );
  // Reuse this account's complete chart history if its summary has no balance.
  const account =
    !decimal(accountBalance(initialAccount).amount) && history.data && !history.error
      ? restoreMissingBalances(initialAccount, history.data)
      : initialAccount;
  const balance = accountBalance(account);
  const currency = balance.currency || account.currency || "";
  const series = balanceHistory(history.data ?? [], currency, range);
  const chart = historyChart(series.points, currency, environment.appearance === "dark");
  const rangeTitle = HISTORY_RANGES.find(({ value }) => value === range)?.title ?? "Last 30 Days";
  const first = series.points[0];
  const last = series.points.at(-1);
  const recent = activity.data ?? [];
  const typeLabel = series.type?.toLowerCase().replace(/_/g, " ") || "reported";
  const coverage = first && last ? `${dateLabel(first.date)} – ${dateLabel(last.date)}` : "No dated history";
  const refresh = () => {
    refreshAccount();
    void history.revalidate();
    void activity.revalidate();
  };
  const change =
    series.change === undefined
      ? ""
      : `${money(series.change, currency)}${series.percent === undefined ? "" : ` (${series.percent}%)`} balance change`;
  const content = [
    `# ${markdown(money(balance.amount, balance.currency))}`,
    `${markdown(balance.kind)} balance · Synced ${markdown(dateLabel(account.balances_last_synced_at, true))}`,
    refreshError
      ? `Couldn't refresh the account. Showing the last loaded account details. ${markdown(refreshError.message)}`
      : "",
    account.balance_warning ? markdown(account.balance_warning) : "",
    history.error
      ? `${rangeTitle} · Couldn't load balance history: ${markdown(history.error.message)}`
      : history.isLoading && !history.data
        ? `${rangeTitle} · Loading recorded balances…`
        : chart && first && last
          ? `**${markdown(change)}** · ${rangeTitle}\n\n![Balance history from ${first.date} to ${last.date}](${chart})\n\n${markdown(coverage)} · ${series.points.length} observations · ${markdown(typeLabel)} balances. Change is between the first and last recorded balances in this range; deposits and withdrawals are included.`
          : `${rangeTitle} · Not enough dated balance history for this range. Try a longer period; some institutions only provide the current balance.`,
    series.creditLimitIncluded ? "These reported balances include a credit limit." : "",
    "## Recent Activity",
    activity.error
      ? `Couldn't load activity: ${markdown(activity.error.message)}`
      : activity.isLoading && !activity.data
        ? "Checking account history for the latest transactions…"
        : recent.length
          ? recent
              .map(
                (transaction) =>
                  `- **${markdown(transactionName(transaction))}** · ${markdown(money(transaction.amount, transaction.currency))} · ${markdown(dateLabel(transactionDate(transaction)))}${transaction.booked ? "" : " · Pending"}`,
              )
              .join("\n")
          : "No transactions reported for this account.",
    !showDetails
      ? `## Account\n\n${markdown(accountName(account))} · ${markdown(account.financial_connection?.institution?.name || "Unknown institution")}\n\nAvailable: ${markdown(money(account.balance?.available, account.currency))} · Cleared: ${markdown(money(account.balance?.cleared, account.currency))}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <Detail
      navigationTitle={accountName(account)}
      isLoading={isRefreshing || history.isLoading || activity.isLoading}
      markdown={content}
      metadata={
        showDetails ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Account" text={accountName(account)} />
            <Detail.Metadata.Label
              title="Institution"
              text={account.financial_connection?.institution?.name || "Not reported"}
            />
            <Detail.Metadata.Label title="Currency" text={currency || "Not reported"} />
            <Detail.Metadata.Label title="Available" text={money(account.balance?.available, account.currency)} />
            <Detail.Metadata.Label title="Cleared" text={money(account.balance?.cleared, account.currency)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="History Coverage" text={coverage} />
            <Detail.Metadata.Label title="Balance Type" text={typeLabel} />
            <Detail.Metadata.Label title="Balance Change" text={change || "Not enough history"} />
            <Detail.Metadata.Label title="Balance Synced" text={dateLabel(account.balances_last_synced_at, true)} />
            <Detail.Metadata.Label
              title="Transactions Synced"
              text={dateLabel(account.transactions_last_synced_at, true)}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="View Account Details"
            icon={Icon.PersonLines}
            target={<AccountDetails account={account} />}
          />
          <Action.Push
            title="View Transactions"
            icon={Icon.Receipt}
            target={<TransactionList initialAccountId={String(account.id)} navigationTitle={accountName(account)} />}
          />
          {supportsHoldings(account) && (
            <Action.Push
              title="View Holdings"
              icon={Icon.LineChart}
              target={<HoldingsList initialAccountId={String(account.id)} navigationTitle={accountName(account)} />}
            />
          )}
          <ActionPanel.Submenu
            title="Change Time Range"
            icon={Icon.Calendar}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "t" }, Windows: { modifiers: ["ctrl"], key: "t" } }}
          >
            {HISTORY_RANGES.map(({ value, title }) => (
              <Action
                key={value}
                title={title}
                icon={range === value ? Icon.Checkmark : Icon.Circle}
                onAction={() => setRange(value)}
              />
            ))}
          </ActionPanel.Submenu>
          <ToggleDetailsAction showDetails={showDetails} onToggle={() => setShowDetails((value) => !value)} />
          {balance.amount != null && (
            <Action.CopyToClipboard
              title="Copy Balance"
              content={money(balance.amount, balance.currency)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
          <Action.OpenInBrowser
            title="Open Account in Synci"
            url={accountUrl(account)}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          {(refreshError || history.error || activity.error) && (
            <CopyErrorDetails error={refreshError || history.error || activity.error} />
          )}
          <CommonActions refresh={refresh} />
        </ActionPanel>
      }
    />
  );
}
