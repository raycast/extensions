import { Detail, ActionPanel, Action, Color, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import { useState, useMemo } from "react";
import type { Account } from "../types/accounts";
import { usePortfolioHistory } from "../hooks/usePortfolioHistory";
import { buildChartMarkdown } from "../lib/chart-builder";
import { formatCurrency, formatPercent, formatChartLabel } from "../lib/formatters";
import { TIMEFRAMES } from "../lib/constants";

interface PortfolioChartProps {
  accounts: Account[];
}

export function PortfolioChart({ accounts }: PortfolioChartProps) {
  const prefs = getPreferenceValues<Preferences>();
  const [timeframe, setTimeframe] = useState<string>(prefs.defaultTimeframe || "1M");

  const { data: portfolioHistory, isLoading } = usePortfolioHistory(accounts, timeframe);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!portfolioHistory?.candles.length) return null;

    const { candles, totalCash, positions } = portfolioHistory;
    const currentValue = candles[candles.length - 1].close;
    const initialValue = candles[0].close;
    const periodGain = currentValue - initialValue;
    const periodGainPct = initialValue > 0 ? (periodGain / initialValue) * 100 : 0;

    // Total cost basis from positions
    let totalCostBasis = 0;
    for (const position of positions) {
      const qty = position.longQuantity || position.shortQuantity || 0;
      const avgCost = position.averagePrice ?? position.averageLongPrice ?? position.taxLotAverageLongPrice ?? 0;
      totalCostBasis += qty * avgCost;
    }
    totalCostBasis += totalCash;

    const totalGain = currentValue - totalCostBasis;
    const totalGainPct = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;

    return {
      currentValue,
      periodGain,
      periodGainPct,
      totalCostBasis,
      totalGain,
      totalGainPct,
      numPositions: positions.length,
      totalCash,
    };
  }, [portfolioHistory]);

  // Build chart
  let chartMarkdown = "";
  if (portfolioHistory && portfolioHistory.candles.length > 0) {
    const prices = portfolioHistory.candles.map((c) => c.close);
    const labels = portfolioHistory.candles.map((c) => formatChartLabel(c.datetime, timeframe));
    chartMarkdown = buildChartMarkdown({ prices, labels }, "Portfolio Chart");
  } else if (isLoading) {
    chartMarkdown = "*Loading portfolio chart...*";
  } else {
    chartMarkdown = "*No portfolio data available*";
  }

  const tf = TIMEFRAMES.find((t) => t.value === timeframe);
  const timeframeLabel = tf?.label ?? timeframe;

  const changeSign = metrics?.periodGain != null ? (metrics.periodGain >= 0 ? "+" : "") : "";
  const priceHeader = metrics
    ? `## ${formatCurrency(metrics.currentValue)} ${changeSign}${formatCurrency(metrics.periodGain)} (${formatPercent(metrics.periodGainPct)})\n\n**${timeframeLabel} Performance**`
    : "";

  const markdown = `# Total Portfolio\n\n${priceHeader}\n\n${chartMarkdown}\n\n*Estimated from current holdings × historical prices. Excludes options, mutual funds, and bonds.*`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        metrics ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Current Value" text={formatCurrency(metrics.currentValue)} />
            <Detail.Metadata.TagList title={`${timeframeLabel} Change`}>
              <Detail.Metadata.TagList.Item
                text={`${formatPercent(metrics.periodGainPct)} (${formatCurrency(metrics.periodGain)})`}
                color={metrics.periodGain >= 0 ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>

            <Detail.Metadata.Separator />

            <Detail.Metadata.Label title="Cost Basis" text={formatCurrency(metrics.totalCostBasis)} />
            <Detail.Metadata.TagList title="Total Gain/Loss">
              <Detail.Metadata.TagList.Item
                text={`${formatPercent(metrics.totalGainPct)} (${formatCurrency(metrics.totalGain)})`}
                color={metrics.totalGain >= 0 ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>

            <Detail.Metadata.Separator />

            <Detail.Metadata.Label title="Positions" text={`${metrics.numPositions} holdings`} />
            <Detail.Metadata.Label title="Cash" text={formatCurrency(metrics.totalCash)} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Submenu title="Chart Timeframe" icon={Icon.Clock}>
            {TIMEFRAMES.map((tf) => (
              <Action
                key={tf.value}
                title={tf.label}
                onAction={() => setTimeframe(tf.value)}
                icon={tf.value === timeframe ? Icon.Checkmark : undefined}
              />
            ))}
          </ActionPanel.Submenu>
          <Action.CopyToClipboard
            title="Copy Total Value"
            content={formatCurrency(metrics?.currentValue ?? 0)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
