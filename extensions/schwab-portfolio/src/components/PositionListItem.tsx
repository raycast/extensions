import { List, Action, ActionPanel, Icon, Color, Keyboard } from "@raycast/api";
import type { Position } from "../types/accounts";
import type { QuoteData } from "../types/quotes";
import { formatChange, formatCurrency, formatPercent, formatNumber } from "../lib/formatters";
import { SCHWAB_POSITIONS_URL } from "../lib/constants";
import { getPositionReturn } from "../lib/position-return";
import { securityName } from "../lib/security-name";
import { SymbolDetail } from "./SymbolDetail";

interface PositionListItemProps {
  position: Position;
  quote?: QuoteData;
}

export function PositionListItem({ position, quote }: PositionListItemProps) {
  const symbol = position.instrument.symbol;
  const isOption = position.instrument.assetType === "OPTION";
  const quantity = position.longQuantity || position.shortQuantity || 0;
  const quantityLabel = isOption
    ? `${quantity} contract${quantity !== 1 ? "s" : ""}`
    : `${formatNumber(quantity)} shares`;

  const dailyChange = quote?.quote?.netPercentChange;
  const description = quote?.reference?.description ?? position.instrument.description ?? "";

  const { unrealizedPL, unrealizedPLPct } = getPositionReturn(position);

  const changeColor = dailyChange != null ? (dailyChange >= 0 ? Color.Green : Color.Red) : undefined;
  const dayPL = position.currentDayProfitLoss;
  const dayPLColor = dayPL > 0 ? Color.Green : dayPL < 0 ? Color.Red : Color.SecondaryText;

  const accessories: List.Item.Accessory[] = [{ text: quantityLabel, tooltip: "Quantity" }];

  if (dailyChange != null) {
    accessories.push({
      tag: { value: formatPercent(dailyChange), color: changeColor },
      tooltip: "Day change %",
    });
  }

  if (position.currentDayProfitLoss != null) {
    accessories.push({
      text: { value: formatChange(position.currentDayProfitLoss), color: dayPLColor },
      tooltip: "Day P/L",
    });
  }

  if (unrealizedPL != null) {
    accessories.push({
      tag: {
        value: `P/L ${unrealizedPLPct != null ? formatPercent(unrealizedPLPct) : formatChange(unrealizedPL)}`,
        color: unrealizedPL >= 0 ? Color.Green : Color.Red,
      },
      tooltip: `Unrealized return: ${formatChange(unrealizedPL)} (${formatPercent(unrealizedPLPct)}). Excludes dividends and realized gains.`,
    });
  }

  if (position.marketValue != null) {
    accessories.push({ text: formatCurrency(position.marketValue), tooltip: "Market value" });
  }

  return (
    <List.Item
      title={symbol}
      subtitle={securityName(description, position.instrument.assetType)}
      keywords={[description]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={<SymbolDetail symbol={symbol} position={position} quote={quote} />}
          />
          <Action.CopyToClipboard title="Copy Ticker" content={symbol} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.OpenInBrowser
            title="Open in Schwab"
            url={SCHWAB_POSITIONS_URL}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        </ActionPanel>
      }
    />
  );
}
