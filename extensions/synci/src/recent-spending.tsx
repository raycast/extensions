import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { CommonActions, ToggleDetailsAction } from "./components/common";
import { ErrorView, withSynci } from "./components/session";
import { TransactionItem } from "./components/transaction";
import { merchantIcon } from "./components/merchant-icon";
import { useAccounts } from "./hooks/use-data";
import { api } from "./lib/api";
import { PERIODS, spendingSummary } from "./lib/finance";
import { accountName, markdown, money } from "./lib/format";
import type { Period, Transaction } from "./lib/types";

function Outflows({ transactions, title }: { transactions: Transaction[]; title: string }) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <List navigationTitle={title} isShowingDetail={showDetails} searchBarPlaceholder="Filter these transactions…">
      {transactions.map((transaction) => (
        <TransactionItem key={transaction.id} transaction={transaction} showDetails={showDetails}>
          <ToggleDetailsAction showDetails={showDetails} onToggle={() => setShowDetails((value) => !value)} />
        </TransactionItem>
      ))}
    </List>
  );
}

function RecentSpending() {
  const preference = getPreferenceValues<Preferences>().spendingPeriod;
  const [period, setPeriod] = useState<Period>(
    ["7", "30", "month"].includes(preference) ? (preference as Period) : "month",
  );
  const [accountId, setAccountId] = useState("all");
  const [showDetails, setShowDetails] = useState(false);
  const toggleDetails = (
    <ToggleDetailsAction showDetails={showDetails} onToggle={() => setShowDetails((value) => !value)} />
  );
  const accounts = useAccounts();
  const abortable = useRef<AbortController | null>(null);
  const { data, error, isLoading, revalidate } = usePromise(
    async (period: Period, accountId: string) => ({
      transactions: await api.spending({ period, accountId }, abortable.current?.signal),
      period,
      accountId,
    }),
    [period, accountId],
    { abortable, onError: () => {} },
  );
  const summary = spendingSummary(data?.period === period && data.accountId === accountId ? data.transactions : []);
  const refresh = () => {
    void revalidate();
    void accounts.revalidate();
  };
  const accountLabel =
    accountId === "all"
      ? "All Accounts"
      : accountName(accounts.data?.find((account) => String(account.id) === accountId));
  const periodLabel = PERIODS.find((item) => item.value === period)?.title || "Recent Spending";
  const filters = (
    <ActionPanel.Submenu
      title="Filter by Account"
      icon={Icon.Wallet}
      shortcut={{ macOS: { modifiers: ["cmd"], key: "f" }, Windows: { modifiers: ["ctrl"], key: "f" } }}
    >
      <Action
        title="All Accounts"
        icon={accountId === "all" ? Icon.Checkmark : Icon.Wallet}
        onAction={() => setAccountId("all")}
      />
      {accounts.data?.map((account) => (
        <Action
          key={account.id}
          title={accountName(account)}
          icon={accountId === String(account.id) ? Icon.Checkmark : Icon.Wallet}
          onAction={() => setAccountId(String(account.id))}
        />
      ))}
    </ActionPanel.Submenu>
  );
  const failure = error || accounts.error;
  return (
    <List
      isLoading={isLoading || accounts.isLoading}
      isShowingDetail={showDetails && !!summary.currencies.length && !failure}
      searchBarPlaceholder="Find a merchant or currency…"
      searchBarAccessory={
        <List.Dropdown tooltip="Spending Period" value={period} onChange={(value) => setPeriod(value as Period)}>
          {PERIODS.filter((item) => item.value !== "all").map((item) => (
            <List.Dropdown.Item key={item.value} value={item.value} title={item.title} />
          ))}
        </List.Dropdown>
      }
    >
      {failure ? (
        <ErrorView error={failure} retry={refresh}>
          {toggleDetails}
          {filters}
        </ErrorView>
      ) : (
        <>
          {!isLoading && !summary.currencies.length && (
            <List.EmptyView
              icon={Icon.BarChart}
              title={summary.invalid ? "Some Transactions Couldn't Be Summarized" : "No Booked Outflows"}
              description={
                summary.invalid
                  ? `${summary.invalid} transactions have missing currencies or invalid amounts. Open Synci to review them.`
                  : `${periodLabel} · ${accountLabel}. Change the period or account to explore more transactions.`
              }
              actions={
                <ActionPanel>
                  {toggleDetails}
                  {filters}
                  <CommonActions refresh={refresh} />
                </ActionPanel>
              }
            />
          )}
          {summary.currencies.map(([currency, total]) => {
            const merchants = [...total.merchants.entries()].sort(([, a], [, b]) => b.amount.comparedTo(a.amount));
            const transactions = merchants
              .flatMap(([, merchant]) => merchant.transactions)
              .sort((a, b) => (b.booking_date || "").localeCompare(a.booking_date || "") || b.id - a.id);
            const explanation = `Booked outflows by booking date. Transfers, cash withdrawals, and investment purchases may be included. Pending transactions and incoming refunds are excluded. No currency conversion.${summary.invalid ? ` ${summary.invalid} records with invalid amounts or missing currencies were excluded.` : ""}`;
            return (
              <List.Section
                key={currency}
                title={`${currency} · ${accountLabel}`}
                subtitle={`${total.count} booked outflows`}
              >
                <List.Item
                  id={`summary-${currency}`}
                  title={money(total.amount.toString(), currency)}
                  subtitle={periodLabel}
                  icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
                  keywords={[currency, "total", "spending"]}
                  detail={
                    <List.Item.Detail
                      markdown={`# ${markdown(periodLabel)}\n\n## ${markdown(money(total.amount.toString(), currency))}\n\n${total.count} booked outflows · ${markdown(accountLabel)}\n\n${explanation}`}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Top Merchants" />
                          {merchants.slice(0, 10).map(([name, merchant]) => (
                            <List.Item.Detail.Metadata.Label
                              key={name}
                              title={name}
                              icon={merchantIcon(merchant.transactions)}
                              text={money(merchant.amount.toString(), currency)}
                            />
                          ))}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Outflows"
                        icon={Icon.Receipt}
                        target={<Outflows title={`${currency} Outflows`} transactions={transactions} />}
                      />
                      <Action.CopyToClipboard
                        title="Copy Summary"
                        content={`${periodLabel} · ${accountLabel}\nBooked outflows: ${money(total.amount.toString(), currency)}\n${total.count} transactions\n\n${explanation}`}
                      />
                      {toggleDetails}
                      {filters}
                      <CommonActions refresh={refresh} />
                    </ActionPanel>
                  }
                />
                {merchants.map(([name, merchant]) => (
                  <List.Item
                    key={name}
                    id={`${currency}-${name}`}
                    title={name}
                    icon={merchantIcon(merchant.transactions)}
                    accessories={[
                      { text: money(merchant.amount.toString(), currency) },
                      { tag: `${merchant.amount.div(total.amount).times(100).toFixed(0)}%` },
                    ]}
                    keywords={[currency]}
                    detail={
                      <List.Item.Detail
                        markdown={`# ${markdown(name)}\n\n## ${markdown(money(merchant.amount.toString(), currency))}\n\n${merchant.count} booked ${merchant.count === 1 ? "outflow" : "outflows"} · ${markdown(periodLabel)}\n\n${merchant.amount.div(total.amount).times(100).toFixed(1)}% of the ${currency} outflows in this selection.\n\n${explanation}`}
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Transactions"
                          icon={Icon.Receipt}
                          target={<Outflows transactions={merchant.transactions} title={name} />}
                        />
                        {toggleDetails}
                        {filters}
                        <CommonActions refresh={refresh} />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            );
          })}
        </>
      )}
    </List>
  );
}
export default withSynci(RecentSpending);
