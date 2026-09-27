import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useState, type ReactNode } from "react";
import { createDeeplink } from "@raycast/utils";
import { CommonActions, EmptyState, ToggleDetailsAction } from "./components/common";
import { ErrorView, withSynci } from "./components/session";
import { TransactionList } from "./components/transaction-list";
import { HoldingsList } from "./components/holdings-list";
import { useAccounts } from "./hooks/use-data";
import { balanceTotals } from "./lib/finance";
import { supportsHoldings } from "./lib/holdings";
import { accountBalance, accountName, accountUrl, dateLabel, markdown, money } from "./lib/format";
import type { FinancialAccount } from "./lib/types";

function AccountItem({
  account,
  refresh,
  showDetails,
  toggleDetails,
}: {
  account: FinancialAccount;
  refresh: () => void;
  showDetails: boolean;
  toggleDetails: ReactNode;
}) {
  const balance = accountBalance(account);
  return (
    <List.Item
      id={`account-${account.id}`}
      title={accountName(account)}
      subtitle={showDetails ? undefined : account.financial_connection?.institution?.name || undefined}
      icon={account.account_category === "INVESTMENT" ? Icon.LineChart : Icon.Wallet}
      keywords={[
        account.currency || "",
        account.display_name || "",
        account.financial_connection?.institution?.name || "",
      ]}
      accessories={[
        ...(!account.enabled ? [{ tag: { value: "Disabled", color: Color.SecondaryText } }] : []),
        {
          text: money(balance.amount, balance.currency),
          tooltip: `${balance.currency || "Unknown currency"} · ${balance.kind} balance · Last sync: ${dateLabel(account.balances_last_synced_at, true)}`,
        },
      ]}
      detail={
        showDetails ? (
          <List.Item.Detail
            markdown={`# ${markdown(accountName(account))}\n\n## ${markdown(money(balance.amount, balance.currency))}\n\n${balance.amount == null ? "Synci has not reported a balance for this account." : `${balance.kind} balance at the last sync.`}${account.balance_warning ? `\n\n${markdown(account.balance_warning)}` : ""}`}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Institution"
                  text={account.financial_connection?.institution?.name || "Not reported"}
                />
                <List.Item.Detail.Metadata.Label title="Currency" text={account.currency || "Not reported"} />
                <List.Item.Detail.Metadata.Label title="Category" text={account.account_category || "Not reported"} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Available"
                  text={money(account.balance?.available, account.currency)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Cleared"
                  text={money(account.balance?.cleared, account.currency)}
                />
                {account.total_balance?.amount != null && (
                  <List.Item.Detail.Metadata.Label
                    title="Portfolio Total"
                    text={money(account.total_balance.amount, account.total_balance.currency)}
                  />
                )}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Balance Synced"
                  text={dateLabel(account.balances_last_synced_at, true)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Transactions Synced"
                  text={dateLabel(account.transactions_last_synced_at, true)}
                />
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="View Transactions"
            icon={Icon.Receipt}
            target={<TransactionList initialAccountId={String(account.id)} navigationTitle={accountName(account)} />}
          />
          {supportsHoldings(account) && (
            <Action.Push
              title="View Holdings"
              icon={Icon.LineChart}
              target={<HoldingsList initialAccountId={String(account.id)} />}
            />
          )}
          <Action.OpenInBrowser
            title="Open Account in Synci"
            url={accountUrl(account)}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          {balance.amount != null && (
            <Action.CopyToClipboard title="Copy Balance" content={money(balance.amount, balance.currency)} />
          )}
          <Action.CreateQuicklink
            title="Create Account Quicklink"
            quicklink={{
              name: `${accountName(account)} Transactions`,
              link: createDeeplink({ command: "search-transactions", context: { accountId: String(account.id) } }),
            }}
          />
          {toggleDetails}
          <CommonActions refresh={refresh} />
        </ActionPanel>
      }
    />
  );
}

function CheckBalances() {
  const { data, error, isLoading, revalidate } = useAccounts(true);
  const [filter, setFilter] = useState("enabled");
  const [search, setSearch] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const accounts =
    data?.filter(
      (account) =>
        (filter === "all" || account.enabled) &&
        `${accountName(account)} ${account.currency} ${account.financial_connection?.institution?.name}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? [];
  const summary = balanceTotals(accounts);
  const toggleDetails = (
    <ToggleDetailsAction showDetails={showDetails} onToggle={() => setShowDetails((value) => !value)} />
  );
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetails && !!accounts.length && !error}
      filtering={false}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Find an account, institution, or currency…"
      searchBarAccessory={
        <List.Dropdown tooltip="Accounts to Include" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="Enabled Accounts" value="enabled" />
          <List.Dropdown.Item title="All Accounts" value="all" />
        </List.Dropdown>
      }
    >
      {error ? (
        <ErrorView error={error} retry={revalidate}>
          {toggleDetails}
        </ErrorView>
      ) : (
        <>
          {!isLoading && !accounts.length && (
            <EmptyState
              title={search ? "No Matching Accounts" : "No Accounts"}
              description="Connect an account in Synci, or change the account filter."
              refresh={revalidate}
            />
          )}
          <List.Section
            title={showDetails ? "Totals" : search ? "Matching Account Totals" : "Totals by Currency"}
            subtitle={
              summary.unavailable
                ? showDetails
                  ? `${summary.unavailable} excluded`
                  : `${summary.unavailable} unavailable balances excluded`
                : "At last sync"
            }
          >
            {summary.totals.map(([currency, total]) => (
              <List.Item
                key={currency}
                id={`total-${currency}`}
                title={money(total.amount.toString(), currency)}
                subtitle={`${total.count} ${total.count === 1 ? "account" : "accounts"}`}
                icon={{ source: Icon.Coins, tintColor: Color.Blue }}
                detail={
                  showDetails ? (
                    <List.Item.Detail
                      markdown={`# ${currency}\n\n## ${markdown(money(total.amount.toString(), currency))}\n\n${total.count} accounts · Last reported balances\n\nBalance types: ${[...total.kinds].join(", ")}. Currencies are not converted.${summary.unavailable ? ` ${summary.unavailable} unavailable balances excluded.` : ""}`}
                      metadata={
                        <List.Item.Detail.Metadata>
                          {accounts
                            .filter(
                              (account) =>
                                accountBalance(account).currency === currency && accountBalance(account).amount != null,
                            )
                            .map((account) => (
                              <List.Item.Detail.Metadata.Label
                                key={account.id}
                                title={accountName(account)}
                                text={money(accountBalance(account).amount, currency)}
                              />
                            ))}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  ) : undefined
                }
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Total" content={money(total.amount.toString(), currency)} />
                    {toggleDetails}
                    <CommonActions refresh={revalidate} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          <List.Section title="Accounts" subtitle={`${accounts.length}`}>
            {accounts.map((account) => (
              <AccountItem
                key={account.id}
                account={account}
                refresh={revalidate}
                showDetails={showDetails}
                toggleDetails={toggleDetails}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
export default withSynci(CheckBalances);
