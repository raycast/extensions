import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { getLatestQuotesAndConvertedTransactions } from "./coinmarketcap";
import { formatCurrency, formatPercent, profitIcon } from "./format";
import { calculateSnapshot } from "./portfolio";
import { getPortfolios, getTransactions } from "./storage";
import { CryptoTransaction, Portfolio, PortfolioSnapshot, Preferences, Quote } from "./types";

type SnapshotData = {
  portfolios: Portfolio[];
  transactions: CryptoTransaction[];
  quotes: Record<string, Quote>;
};

export default function Command() {
  const { baseCurrency } = getPreferenceValues<Preferences>();
  const [data, setData] = useState<SnapshotData>({ portfolios: [], transactions: [], quotes: {} });
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const [portfolios, transactions] = await Promise.all([getPortfolios(), getTransactions()]);
    const pricedData = await getLatestQuotesAndConvertedTransactions(transactions, baseCurrency);
    setData({ portfolios, transactions: pricedData.transactions, quotes: pricedData.quotes });
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const snapshots = useMemo(
    () => data.portfolios.map((portfolio) => calculateSnapshot(portfolio, data.transactions, data.quotes)),
    [data.portfolios, data.quotes, data.transactions],
  );
  const totalValue = snapshots.reduce((sum, snapshot) => sum + snapshot.totalValue, 0);
  const totalPnl = snapshots.reduce((sum, snapshot) => sum + snapshot.totalPnl, 0);

  return (
    <List isLoading={isLoading} navigationTitle="Portfolio Snapshot" searchBarPlaceholder="Search portfolios">
      <List.Section title="Total">
        <List.Item
          icon={Icon.Wallet}
          title="All Wallets"
          accessories={[
            { text: formatCurrency(totalValue, baseCurrency), tooltip: "Current value" },
            {
              text: `${profitIcon(totalPnl)} ${formatCurrency(totalPnl, baseCurrency)}`,
              icon: { source: Icon.Circle, tintColor: totalPnl >= 0 ? Color.Green : Color.Red },
              tooltip: "Total P/L",
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Refresh Snapshot" icon={Icon.ArrowClockwise} onAction={load} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Wallets">
        {snapshots.map((snapshot) => (
          <SnapshotItem key={snapshot.portfolio.id} snapshot={snapshot} currency={baseCurrency} onRefresh={load} />
        ))}
      </List.Section>
    </List>
  );
}

function SnapshotItem(props: { snapshot: PortfolioSnapshot; currency: string; onRefresh: () => void }) {
  const { snapshot, currency, onRefresh } = props;

  return (
    <List.Item
      icon={snapshot.portfolio.emoji || Icon.Folder}
      title={snapshot.portfolio.name}
      subtitle={`${snapshot.positions.filter((position) => position.quantity > 0).length} holdings`}
      accessories={[
        { text: formatCurrency(snapshot.totalValue, currency), tooltip: "Current value" },
        {
          text: `${profitIcon(snapshot.totalPnl)} ${formatCurrency(snapshot.totalPnl, currency)} · ${formatPercent(
            snapshot.totalPnlPercent,
          )}`,
          icon: { source: Icon.Circle, tintColor: snapshot.totalPnl >= 0 ? Color.Green : Color.Red },
          tooltip: "Total P/L",
        },
      ]}
      actions={
        <ActionPanel>
          <Action title="Refresh Snapshot" icon={Icon.ArrowClockwise} onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
