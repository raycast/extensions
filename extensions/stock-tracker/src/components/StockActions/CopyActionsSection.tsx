import React from "react";
import { ActionPanel, Action } from "@raycast/api";
import { StockItem, WatchlistItem } from "../../types";
import { formatPrice } from "../../utils/formatting";
import { useStockActions } from "../../hooks/useStockActions";

export interface CopyActionsSectionProps {
  stock: StockItem | WatchlistItem;
  showWatchlistActions: boolean;
  handleCopySymbol: () => void;
  t: ReturnType<typeof useStockActions>["t"];
}

export function CopyActionsSection({ stock, showWatchlistActions, handleCopySymbol, t }: CopyActionsSectionProps) {
  return (
    <ActionPanel.Section title={t.actions.copySectionTitle}>
      <Action.CopyToClipboard
        content={stock.symbol}
        title={t.actions.copySymbol}
        shortcut={showWatchlistActions ? { modifiers: ["cmd"], key: "c" } : { modifiers: [], key: "enter" }}
        onCopy={handleCopySymbol}
      />
      <Action.CopyToClipboard
        content={stock.name || stock.symbol}
        title={t.actions.copyName}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      {stock.price !== undefined && (
        <Action.CopyToClipboard content={formatPrice(stock, undefined, t.common.na)} title={t.actions.copyPrice} />
      )}
    </ActionPanel.Section>
  );
}
