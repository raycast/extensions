import type { PortfolioResponse } from "@nktkas/hyperliquid";
import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";

import { lineChartMarkdownImage } from "./lib/chart";
import { formatCompactUsd, formatPercentChange, formatPrice, formatUsd, getSignedColor } from "./lib/format";
import {
  aggregatePortfolioSeries,
  aggregatePositionRows,
  applyLiveMidsToPositions,
  extractPortfolioSeries,
  fetchPortfolios,
  fetchPositionStates,
  recomputeSummary,
} from "./lib/hyperliquid";
import { getHyperliquidTradeUrl } from "./lib/navigation";
import { getActiveWalletId, getStoredWallets, setActiveWalletId } from "./lib/raycast-storage";
import { getAccountRisk, getPositionRisk, riskBadge, thresholdsFromPercent } from "./lib/risk";
import type { AggregatedPositions, PortfolioMetric, PortfolioPeriod, RiskLevel, Wallet } from "./lib/types";
import { useLiveMids } from "./lib/use-live-mids";

const emptyPositions: AggregatedPositions = {
  summary: { accountValue: 0, unrealizedPnl: 0, marginUsed: 0, maintenanceMarginUsed: 0 },
  positions: [],
};

const PERIOD_LABELS: Record<PortfolioPeriod, string> = {
  day: "1 Day",
  week: "1 Week",
  month: "1 Month",
  allTime: "All Time",
};

async function loadWallets(): Promise<Wallet[]> {
  return getStoredWallets();
}

async function loadActiveWallet(): Promise<string | undefined> {
  return getActiveWalletId();
}

async function loadPositions(wallets: Wallet[]): Promise<AggregatedPositions> {
  if (wallets.length === 0) {
    return emptyPositions;
  }

  return aggregatePositionRows(wallets, await fetchPositionStates(wallets));
}

function signedColor(value: number): Color {
  const color = getSignedColor(value);
  if (color === "green") {
    return Color.Green;
  }
  if (color === "red") {
    return Color.Red;
  }
  return Color.SecondaryText;
}

function riskColor(level: RiskLevel): Color {
  if (level === "danger") {
    return Color.Red;
  }
  if (level === "warning") {
    return Color.Orange;
  }
  return Color.Green;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.Positions>();
  const thresholds = useMemo(
    () => thresholdsFromPercent(Number(preferences.liqAlertDistance)),
    [preferences.liqAlertDistance],
  );
  const walletsState = useCachedPromise(loadWallets, [], { initialData: [] });
  const activeWalletState = useCachedPromise(loadActiveWallet, [], { initialData: "all" });
  const [selectedWalletId, setSelectedWalletId] = useState<string | undefined>();
  const liveMids = useLiveMids(true);
  const wallets = walletsState.data ?? [];
  const selectedId = selectedWalletId ?? activeWalletState.data ?? "all";
  const selectedWallets = useMemo(() => {
    if (selectedId === "all") {
      return wallets;
    }
    return wallets.filter((wallet) => wallet.id === selectedId);
  }, [selectedId, wallets]);
  const positionsState = useCachedPromise(loadPositions, [selectedWallets], {
    execute: wallets.length > 0,
    initialData: emptyPositions,
    keepPreviousData: true,
  });
  const data = positionsState.data ?? emptyPositions;
  const positions = useMemo(() => applyLiveMidsToPositions(data.positions, liveMids), [data.positions, liveMids]);
  const summary = useMemo(() => recomputeSummary(data.summary, positions), [data.summary, positions]);
  const accountRisk = useMemo(
    () => getAccountRisk(summary.accountValue, summary.maintenanceMarginUsed, thresholds),
    [summary.accountValue, summary.maintenanceMarginUsed, thresholds],
  );

  async function selectWallet(value: string) {
    setSelectedWalletId(value);
    await setActiveWalletId(value);
  }

  const sectionSubtitle = `uPnL ${formatUsd(summary.unrealizedPnl)} · Margin ${formatUsd(summary.marginUsed)}${
    accountRisk.marginRatio === null ? "" : ` · Health ${(accountRisk.marginRatio * 100).toFixed(0)}%`
  }`;

  return (
    <List
      isLoading={walletsState.isLoading || activeWalletState.isLoading || positionsState.isLoading}
      searchBarPlaceholder="Search positions"
      searchBarAccessory={
        wallets.length > 0 ? (
          <List.Dropdown tooltip="Wallet" value={selectedId} onChange={selectWallet}>
            <List.Dropdown.Item title="All Wallets" value="all" />
            {wallets.map((wallet) => (
              <List.Dropdown.Item key={wallet.id} title={wallet.label} value={wallet.id} />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      {wallets.length === 0 && !walletsState.isLoading ? (
        <List.EmptyView
          title="No Wallets"
          description="Add a wallet in Manage Wallets to view read-only perps positions."
        />
      ) : (
        <List.Section
          title={`Perps Account ${formatUsd(summary.accountValue)} ${riskBadge(accountRisk.level)}`}
          subtitle={sectionSubtitle}
        >
          <List.Item
            title="Portfolio Performance"
            icon={{ source: Icon.LineChart, tintColor: Color.Blue }}
            accessories={[{ text: "Equity & PnL over time" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Portfolio Chart"
                  icon={Icon.LineChart}
                  target={<PortfolioDetail wallets={selectedWallets} />}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => positionsState.revalidate()} />
              </ActionPanel>
            }
          />
          {positions.length === 0 && !positionsState.isLoading ? (
            <List.Item title="No Open Positions" icon={Icon.CheckCircle} />
          ) : (
            positions.map((position) => {
              const risk = getPositionRisk(position.markPrice, position.liquidationPrice, thresholds);
              const liqText =
                position.liquidationPrice === null ? "Liq —" : `Liq ${formatPrice(position.liquidationPrice)}`;
              return (
                <List.Item
                  key={position.id}
                  title={`${position.coin} ${position.side}`}
                  subtitle={
                    selectedId === "all" ? position.walletLabel : `${position.leverageType} ${position.leverage}x`
                  }
                  icon={{
                    source: position.side === "Long" ? Icon.ArrowUp : Icon.ArrowDown,
                    tintColor: signedColor(position.size),
                  }}
                  accessories={[
                    {
                      text: formatUsd(position.unrealizedPnl),
                      icon: { source: Icon.Coins, tintColor: signedColor(position.unrealizedPnl) },
                    },
                    { text: formatPercentChange(position.returnOnEquity) },
                    {
                      text: liqText,
                      icon:
                        risk.level === "safe" ? undefined : { source: Icon.Warning, tintColor: riskColor(risk.level) },
                      tooltip:
                        risk.distanceToLiq === null
                          ? undefined
                          : `${(risk.distanceToLiq * 100).toFixed(1)}% from liquidation`,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open in Browser" url={getHyperliquidTradeUrl(position.coin)} />
                      <Action.Push
                        title="Show Portfolio Chart"
                        icon={Icon.LineChart}
                        target={<PortfolioDetail wallets={selectedWallets} />}
                      />
                      <Action.CopyToClipboard title="Copy Coin" content={position.coin} />
                      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => positionsState.revalidate()} />
                    </ActionPanel>
                  }
                />
              );
            })
          )}
        </List.Section>
      )}
    </List>
  );
}

async function loadPortfolios(wallets: Wallet[]): Promise<PortfolioResponse[]> {
  if (wallets.length === 0) {
    return [];
  }
  return fetchPortfolios(wallets);
}

function PortfolioDetail({ wallets }: { wallets: Wallet[] }) {
  const [period, setPeriod] = useState<PortfolioPeriod>("week");
  const [metric, setMetric] = useState<PortfolioMetric>("accountValue");
  const portfoliosState = useCachedPromise(loadPortfolios, [wallets], {
    execute: wallets.length > 0,
    initialData: [],
    keepPreviousData: true,
  });

  const series = useMemo(() => {
    const portfolios = portfoliosState.data ?? [];
    if (portfolios.length === 0) {
      return [];
    }
    return aggregatePortfolioSeries(portfolios.map((portfolio) => extractPortfolioSeries(portfolio, period, metric)));
  }, [portfoliosState.data, period, metric]);

  const metricLabel = metric === "pnl" ? "PnL" : "Account Value";
  const markdown = lineChartMarkdownImage(series, {
    title: `${metricLabel} · ${PERIOD_LABELS[period]}`,
    width: 720,
    height: 320,
    formatValue: formatCompactUsd,
    lineColor: metric === "pnl" ? undefined : "#38bdf8",
  });

  const first = series[0]?.value ?? 0;
  const last = series[series.length - 1]?.value ?? 0;
  const change = last - first;
  const values = series.map((point) => point.value);
  const high = values.length > 0 ? Math.max(...values) : 0;
  const low = values.length > 0 ? Math.min(...values) : 0;

  function toggleMetric() {
    setMetric((current) => (current === "pnl" ? "accountValue" : "pnl"));
  }

  return (
    <List
      navigationTitle="Portfolio Performance"
      isShowingDetail
      isLoading={portfoliosState.isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Timeframe" value={period} onChange={(value) => setPeriod(value as PortfolioPeriod)}>
          {(Object.keys(PERIOD_LABELS) as PortfolioPeriod[]).map((key) => (
            <List.Dropdown.Item key={key} title={PERIOD_LABELS[key]} value={key} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Item
        title={metricLabel}
        detail={
          <List.Item.Detail
            markdown={markdown}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Metric" text={metricLabel} />
                <List.Item.Detail.Metadata.Label title="Timeframe" text={PERIOD_LABELS[period]} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Latest" text={formatUsd(last)} />
                <List.Item.Detail.Metadata.Label
                  title="Change"
                  text={formatUsd(change)}
                  icon={{ source: change >= 0 ? Icon.ArrowUp : Icon.ArrowDown, tintColor: signedColor(change) }}
                />
                <List.Item.Detail.Metadata.Label title="Period High" text={formatUsd(high)} />
                <List.Item.Detail.Metadata.Label title="Period Low" text={formatUsd(low)} />
                <List.Item.Detail.Metadata.Label title="Wallets" text={`${wallets.length}`} />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action
              title={metric === "pnl" ? "Show Account Value" : "Show PnL"}
              icon={Icon.Switch}
              onAction={toggleMetric}
            />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => portfoliosState.revalidate()} />
          </ActionPanel>
        }
      />
    </List>
  );
}
