import { Color, Icon, MenuBarExtra, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { getLatestQuotesAndConvertedTransactions } from "./coinmarketcap";
import { formatCurrency, formatPercent } from "./format";
import { calculateSnapshot } from "./portfolio";
import { getMenuBarPortfolioId, getPortfolios, getTransactions, setMenuBarPortfolioId } from "./storage";
import { PortfolioSnapshot } from "./types";

type MenuBarState = {
  isLoading: boolean;
  snapshots: PortfolioSnapshot[];
  selectedPortfolioId?: string;
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
};

export default function Command() {
  const { baseCurrency } = getPreferenceValues<Preferences>();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<MenuBarState>({
    isLoading: true,
    snapshots: [],
    totalValue: 0,
    totalPnl: 0,
    totalPnlPercent: 0,
  });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [portfolios, transactions, storedPortfolioId] = await Promise.all([
          getPortfolios(),
          getTransactions(),
          getMenuBarPortfolioId(),
        ]);
        const pricedData = await getLatestQuotesAndConvertedTransactions(transactions, baseCurrency);
        const snapshots = portfolios.map((portfolio) =>
          calculateSnapshot(portfolio, pricedData.transactions, pricedData.quotes),
        );
        const selectedPortfolioId = snapshots.some((snapshot) => snapshot.portfolio.id === storedPortfolioId)
          ? storedPortfolioId
          : undefined;
        const activeSnapshots = selectedPortfolioId
          ? snapshots.filter((snapshot) => snapshot.portfolio.id === selectedPortfolioId)
          : snapshots;
        const totalValue = activeSnapshots.reduce((sum, snapshot) => sum + snapshot.totalValue, 0);
        const totalPnl = activeSnapshots.reduce((sum, snapshot) => sum + snapshot.totalPnl, 0);
        const invested = activeSnapshots.reduce(
          (sum, snapshot) =>
            sum + snapshot.positions.reduce((positionSum, position) => positionSum + position.investedAmount, 0),
          0,
        );

        if (isMounted) {
          setState({
            isLoading: false,
            snapshots,
            selectedPortfolioId,
            totalValue,
            totalPnl,
            totalPnlPercent: invested === 0 ? 0 : (totalPnl / invested) * 100,
          });
        }
      } catch (error) {
        if (isMounted) {
          setState((current) => ({ ...current, isLoading: false }));
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Portfolio Value Failed",
          message: error instanceof Error ? error.message : undefined,
        });
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [baseCurrency, revision]);

  const selectedSnapshot = state.snapshots.find((snapshot) => snapshot.portfolio.id === state.selectedPortfolioId);
  const displayName = selectedSnapshot?.portfolio.name || "All Wallets";

  return (
    <MenuBarExtra
      icon={{ source: Icon.Wallet, tintColor: state.totalPnl >= 0 ? Color.Green : Color.Red }}
      isLoading={state.isLoading}
      title={formatCurrency(state.totalValue, baseCurrency)}
      tooltip={`${displayName} · ${formatCurrency(state.totalPnl, baseCurrency)} · ${formatPercent(state.totalPnlPercent)}`}
    >
      <MenuBarExtra.Section title={displayName}>
        <MenuBarExtra.Item title="Value" subtitle={formatCurrency(state.totalValue, baseCurrency)} />
        <MenuBarExtra.Item
          title="P/L"
          subtitle={`${formatCurrency(state.totalPnl, baseCurrency)} · ${formatPercent(state.totalPnlPercent)}`}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Menu Bar Display">
        <MenuBarExtra.Item
          icon={!state.selectedPortfolioId ? Icon.CheckCircle : Icon.Circle}
          title="All Wallets"
          onAction={async () => {
            await setMenuBarPortfolioId(undefined);
            setRevision((value) => value + 1);
          }}
        />
        {state.snapshots.map((snapshot) => (
          <MenuBarExtra.Item
            key={`display-${snapshot.portfolio.id}`}
            icon={
              state.selectedPortfolioId === snapshot.portfolio.id
                ? Icon.CheckCircle
                : snapshot.portfolio.emoji || Icon.Folder
            }
            title={snapshot.portfolio.name}
            subtitle={formatCurrency(snapshot.totalValue, baseCurrency)}
            onAction={async () => {
              await setMenuBarPortfolioId(snapshot.portfolio.id);
              setRevision((value) => value + 1);
            }}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Wallets">
        {state.snapshots.map((snapshot) => (
          <MenuBarExtra.Item
            key={snapshot.portfolio.id}
            icon={snapshot.portfolio.emoji || Icon.Folder}
            title={snapshot.portfolio.name}
            subtitle={`${formatCurrency(snapshot.totalValue, baseCurrency)} · ${formatPercent(snapshot.totalPnlPercent)}`}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
