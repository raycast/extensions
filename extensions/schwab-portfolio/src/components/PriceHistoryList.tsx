import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePriceHistory } from "../hooks/usePriceHistory";
import { formatCurrency, formatPercent } from "../lib/formatters";
import { getTimeframe } from "../lib/constants";

interface PriceHistoryListProps {
  symbol: string;
  timeframeValue: string;
}

function rowLabel(datetime: number, intraday: boolean): string {
  const date = new Date(datetime);
  return intraday
    ? date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Keyboard-browsable candle data — Raycast's stand-in for hovering a chart. */
export function PriceHistoryList({ symbol, timeframeValue }: PriceHistoryListProps) {
  const tf = getTimeframe(timeframeValue);
  const { data, isLoading } = usePriceHistory(symbol, timeframeValue);

  const candles = [...(data?.candles ?? [])].sort((a, b) => b.datetime - a.datetime);
  const intraday = tf.frequencyType === "minute";
  const periodHigh = candles.length > 0 ? Math.max(...candles.map((candle) => candle.high)) : 0;
  const periodLow = candles.length > 0 ? Math.min(...candles.map((candle) => candle.low)) : 0;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${symbol} — ${tf.label} Price Data`}
      searchBarPlaceholder={`Search ${symbol} ${tf.label} candles by date...`}
    >
      {candles.map((candle, index) => {
        const previousClose = candles[index + 1]?.close;
        const changePct = previousClose ? ((candle.close - previousClose) / previousClose) * 100 : undefined;
        const isHigh = candle.high === periodHigh;
        const isLow = candle.low === periodLow;

        const accessories: List.Item.Accessory[] = [
          { text: `H ${formatCurrency(candle.high)} · L ${formatCurrency(candle.low)}`, tooltip: "High · Low" },
        ];
        if (changePct != null) {
          accessories.push({
            tag: { value: formatPercent(changePct), color: changePct >= 0 ? Color.Green : Color.Red },
            tooltip: intraday ? "Change vs previous candle" : "Change vs previous close",
          });
        }
        accessories.push({ text: { value: formatCurrency(candle.close), color: Color.PrimaryText }, tooltip: "Close" });

        return (
          <List.Item
            key={candle.datetime}
            icon={
              isHigh
                ? { source: Icon.ArrowUp, tintColor: Color.Green }
                : isLow
                  ? { source: Icon.ArrowDown, tintColor: Color.Red }
                  : undefined
            }
            title={rowLabel(candle.datetime, intraday)}
            subtitle={isHigh ? "Period high" : isLow ? "Period low" : undefined}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Close Price" content={candle.close.toString()} />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && candles.length === 0 && <List.EmptyView title="No price data available" />}
    </List>
  );
}
