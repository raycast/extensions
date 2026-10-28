import { Detail, ActionPanel, Action, Color, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import { useState, useMemo } from "react";
import { getAccountTotalValue } from "../types/accounts";
import type { Account } from "../types/accounts";
import { usePortfolioHistory } from "../hooks/usePortfolioHistory";
import { buildChartMarkdown } from "../lib/chart-builder";
import { formatCurrency, formatPercent, formatChartLabel, formatDate } from "../lib/formatters";
import { SCHWAB_POSITIONS_URL, TIMEFRAMES } from "../lib/constants";

interface PortfolioChartProps {
  accounts: Account[];
}

export function PortfolioChart({ accounts }: PortfolioChartProps) {
  const prefs = getPreferenceValues<Preferences>();
  const [timeframe, setTimeframe] = useState<string>(prefs.defaultTimeframe || "1M");

  const { data: portfolioHistory, isLoading, error } = usePortfolioHistory(accounts, timeframe);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!portfolioHistory?.candles.length) return null;

    const { candles, totalCash, positions } = portfolioHistory;
    const currentValue = candles[candles.length - 1].close;
    const initialValue = candles[0].close;
    const periodGain = currentValue - initialValue;
    const periodGainPct = initialValue > 0 ? (periodGain / initialValue) * 100 : undefined;

    return {
      currentValue,
      periodGain,
      periodGainPct,
      numPositions: positions.length,
      totalCash,
      start: candles[0].datetime,
      end: candles[candles.length - 1].datetime,
    };
  }, [portfolioHistory]);

  const accountValue = accounts.reduce((sum, account) => sum + getAccountTotalValue(account), 0);

  // Build chart
  let chartMarkdown = "";
  if (portfolioHistory && portfolioHistory.candles.length > 0) {
    const prices = portfolioHistory.candles.map((c) => c.close);
    const labels = portfolioHistory.candles.map((c) => formatChartLabel(c.datetime, timeframe));
    chartMarkdown = buildChartMarkdown({ prices, labels }, "Portfolio Chart");
  } else if (error) {
    chartMarkdown = "*A complete estimate is unavailable for this period. Try another timeframe.*";
  } else if (isLoading) {
    chartMarkdown = "*Loading portfolio chart...*";
  } else {
    chartMarkdown = "*No portfolio data available*";
  }

  const tf = TIMEFRAMES.find((t) => t.value === timeframe);
  const timeframeLabel = tf?.label ?? timeframe;

  const changeSign = metrics?.periodGain != null ? (metrics.periodGain >= 0 ? "+" : "") : "";
  const priceHeader = metrics
    ? `## ${formatCurrency(metrics.currentValue)} ${changeSign}${formatCurrency(metrics.periodGain)} (${formatPercent(metrics.periodGainPct)})\n\n**${timeframeLabel} hypothetical price change**`
    : "";

  const markdown = `# Current Holdings History\n\nThis is **not your account return**. It estimates what today's stock and ETF quantities would have been worth at past prices, with today's cash held constant. It excludes trades, deposits, withdrawals, dividends, options, mutual funds, and bonds.\n\n${priceHeader}\n\n${chartMarkdown}\n\n[View your account in Schwab](${SCHWAB_POSITIONS_URL}) for actual performance.`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        metrics ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Account Value Now" text={formatCurrency(accountValue)} />
            <Detail.Metadata.Label title="Estimated Holdings + Cash" text={formatCurrency(metrics.currentValue)} />
            <Detail.Metadata.Label
              title="Price Dates"
              text={`${formatDate(metrics.start)} – ${formatDate(metrics.end)}`}
            />
            <Detail.Metadata.TagList title="Hypothetical Change">
              <Detail.Metadata.TagList.Item
                text={`${formatPercent(metrics.periodGainPct)} (${formatCurrency(metrics.periodGain)})`}
                color={metrics.periodGain >= 0 ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>

            <Detail.Metadata.Separator />

            <Detail.Metadata.Label title="Included Positions" text={`${metrics.numPositions} holdings`} />
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
          <Action.OpenInBrowser title="View Account in Schwab" url={SCHWAB_POSITIONS_URL} />
          <Action.CopyToClipboard
            title="Copy Account Value"
            content={formatCurrency(accountValue)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
