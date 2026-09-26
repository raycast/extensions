import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { createDeeplink, usePromise } from "@raycast/utils";
import { useRef, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { accountName, accountUrl, dateLabel, money } from "../lib/format";
import {
  assetClass,
  holdingFields,
  holdingName,
  holdingsTotals,
  quantity,
  supportsHoldings,
  uniqueHoldings,
} from "../lib/holdings";
import type { AccountHolding, FinancialAccount } from "../lib/types";
import { AccountDropdown, CommonActions, ToggleDetailsAction } from "./common";
import { ErrorView } from "./session";

function HoldingActions({
  holding,
  account,
  selectedField,
  children,
  refresh,
}: {
  holding: AccountHolding;
  account: FinancialAccount;
  selectedField?: string;
  children?: ReactNode;
  refresh?: () => void;
}) {
  return (
    <ActionPanel>
      {selectedField !== undefined ? (
        <Action.CopyToClipboard
          title="Copy Field Value"
          content={selectedField}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : (
        <Action.Push
          title="View Holding"
          icon={Icon.BulletPoints}
          target={<HoldingDetail holding={holding} account={account} />}
        />
      )}
      <Action.OpenInBrowser
        title="Open Account in Synci"
        url={accountUrl(account)}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <ActionPanel.Section title="Copy">
        {holding.symbol && <Action.CopyToClipboard title="Copy Symbol" content={holding.symbol} />}
        {holding.quantity != null && (
          <Action.CopyToClipboard title="Copy Quantity" content={String(holding.quantity)} />
        )}
        <Action.CopyToClipboard
          title="Copy Holding"
          content={holdingFields(holding, account)
            .map(([label, value]) => `${label}: ${value}`)
            .join("\n")}
        />
        <Action.CopyToClipboard title="Copy Holding JSON" content={JSON.stringify(holding, null, 2)} />
      </ActionPanel.Section>
      {children}
      <Action.CreateQuicklink
        title="Create Holdings Quicklink"
        quicklink={{
          name: `${accountName(account)} Holdings`,
          link: createDeeplink({ command: "view-holdings", context: { accountId: String(account.id) } }),
        }}
      />
      <CommonActions refresh={refresh} />
    </ActionPanel>
  );
}

function HoldingDetail({ holding, account }: { holding: AccountHolding; account: FinancialAccount }) {
  return (
    <List navigationTitle={`${holdingName(holding)} Details`} searchBarPlaceholder="Find a holding field…">
      {holdingFields(holding, account).map(([title, value]) => (
        <List.Item
          key={title}
          title={title}
          keywords={[value]}
          accessories={[{ text: value, tooltip: value }]}
          actions={<HoldingActions holding={holding} account={account} selectedField={value} />}
        />
      ))}
    </List>
  );
}

function HoldingItem({
  holding,
  account,
  showDetails,
  toggleDetails,
  refresh,
}: {
  holding: AccountHolding;
  account: FinancialAccount;
  showDetails: boolean;
  toggleDetails: ReactNode;
  refresh: () => void;
}) {
  return (
    <List.Item
      id={`holding-${account.id}-${holding.id}`}
      title={holdingName(holding)}
      subtitle={showDetails || !holding.symbol ? undefined : holding.description || undefined}
      icon={holding.asset_class === "CRYPTOCURRENCY" ? Icon.Coins : Icon.LineChart}
      keywords={[
        holding.symbol || "",
        holding.description || "",
        assetClass(holding.asset_class),
        holding.currency || "",
        accountName(account),
        account.financial_connection?.institution?.name || "",
      ]}
      accessories={[
        ...(!showDetails ? [{ text: `${quantity(holding.quantity)} units`, tooltip: "Quantity" }] : []),
        {
          text: money(holding.market_value, holding.currency),
          tooltip: `${holding.currency || "Unknown currency"} · Market value · Last sync: ${dateLabel(holding.synced_at, true)}`,
        },
      ]}
      detail={
        showDetails ? (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                {holdingFields(holding, account).map(([title, text]) => (
                  <List.Item.Detail.Metadata.Label key={title} title={title} text={text} />
                ))}
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <HoldingActions holding={holding} account={account} refresh={refresh}>
          {toggleDetails}
        </HoldingActions>
      }
    />
  );
}

export function HoldingsList({ initialAccountId = "all" }: { initialAccountId?: string }) {
  const [accountId, setAccountId] = useState(initialAccountId);
  const [showDetails, setShowDetails] = useState(false);
  const [search, setSearch] = useState("");
  const abortable = useRef<AbortController | null>(null);
  const { data, error, isLoading, revalidate } = usePromise(
    async (accountId: string) => {
      const signal = abortable.current?.signal;
      const accounts = await api.accounts(signal);
      const selected = accounts.filter((account) =>
        accountId === "all" ? supportsHoldings(account) : String(account.id) === accountId,
      );
      if (accountId !== "all" && !selected.length)
        throw new Error(
          "This account is no longer available. Choose another account or reconnect Synci to review access.",
        );
      const positions = await api.holdingsForAccounts(selected, signal);
      return {
        accounts,
        positions: positions.map((entry) => ({ ...entry, holdings: uniqueHoldings(entry.holdings) })),
        accountId,
      };
    },
    [accountId],
    { abortable, onError: () => {} },
  );
  // Never show a previous account's holdings while the new selection is loading.
  const positions = data?.accountId === accountId && !error ? data.positions : [];
  const holdings = positions.flatMap((entry) => entry.holdings);
  const summary = holdingsTotals(holdings);
  const toggleDetails = (
    <ToggleDetailsAction showDetails={showDetails} onToggle={() => setShowDetails((value) => !value)} />
  );
  const selectedAccount = data?.accounts.find((account) => String(account.id) === accountId);
  return (
    <List
      navigationTitle="Holdings"
      isLoading={isLoading}
      isShowingDetail={showDetails && !!holdings.length}
      filtering
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Find a symbol, asset, or account…"
      searchBarAccessory={<AccountDropdown accounts={data?.accounts} value={accountId} onChange={setAccountId} />}
    >
      {error ? (
        <ErrorView error={error} retry={revalidate}>
          {toggleDetails}
        </ErrorView>
      ) : (
        <>
          {!isLoading && !holdings.length && (
            <List.EmptyView
              icon={Icon.LineChart}
              title="No Holdings Reported"
              description={`${selectedAccount ? `${accountName(selectedAccount)}. ` : ""}Holdings are available for supported brokerage and crypto accounts after a sync. Choose another account or check it in Synci.`}
              actions={
                <ActionPanel>
                  {selectedAccount && (
                    <Action.OpenInBrowser title="Open Account in Synci" url={accountUrl(selectedAccount)} />
                  )}
                  {toggleDetails}
                  <CommonActions refresh={revalidate} />
                </ActionPanel>
              }
            />
          )}
          {!search.trim() && summary.totals.length > 0 && (
            <List.Section
              title={showDetails ? "Totals" : "Holdings by Currency"}
              subtitle={
                showDetails
                  ? summary.unavailable
                    ? `${summary.unavailable} excluded`
                    : "At last sync"
                  : summary.unavailable
                    ? `${summary.unavailable} unavailable values excluded`
                    : "At last sync · Excludes cash"
              }
            >
              {summary.totals.map(([currency, total]) => (
                <List.Item
                  key={currency}
                  id={`total-${currency}`}
                  title={money(total.amount.toString(), currency)}
                  subtitle={`${currency} · ${total.count} ${total.count === 1 ? "holding" : "holdings"}`}
                  icon={{ source: Icon.Coins, tintColor: Color.Blue }}
                  detail={
                    showDetails ? (
                      <List.Item.Detail
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Currency" text={currency} />
                            <List.Item.Detail.Metadata.Label
                              title="Market Value"
                              text={money(total.amount.toString(), currency)}
                            />
                            <List.Item.Detail.Metadata.Label title="Holdings" text={String(total.count)} />
                            <List.Item.Detail.Metadata.Label
                              title="Includes"
                              text="Reported positions at last sync; excludes cash"
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Unavailable Values"
                              text={String(summary.unavailable)}
                            />
                            <List.Item.Detail.Metadata.Separator />
                            {positions.flatMap(({ account, holdings }) =>
                              holdingsTotals(holdings)
                                .totals.filter(([code]) => code === currency)
                                .map(([, subtotal]) => (
                                  <List.Item.Detail.Metadata.Label
                                    key={account.id}
                                    title={accountName(account)}
                                    text={money(subtotal.amount.toString(), currency)}
                                  />
                                )),
                            )}
                          </List.Item.Detail.Metadata>
                        }
                      />
                    ) : undefined
                  }
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Total"
                        content={`${money(total.amount.toString(), currency)} (${currency})`}
                      />
                      {toggleDetails}
                      <CommonActions refresh={revalidate} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {positions
            .filter((entry) => entry.holdings.length)
            .map(({ account, holdings }) => (
              <List.Section
                key={account.id}
                title={accountName(account)}
                subtitle={
                  showDetails
                    ? `${holdings.length} holdings`
                    : [
                        account.financial_connection?.institution?.name,
                        `${holdings.length} holdings`,
                        !account.enabled ? "Sync disabled" : undefined,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                }
              >
                {holdings.map((holding) => (
                  <HoldingItem
                    key={holding.id}
                    holding={holding}
                    account={account}
                    showDetails={showDetails}
                    toggleDetails={toggleDetails}
                    refresh={revalidate}
                  />
                ))}
              </List.Section>
            ))}
        </>
      )}
    </List>
  );
}
