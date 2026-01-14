import React, { useMemo } from "react";
import { ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";
import { StockItem, WatchlistItem, WatchlistArray } from "../../types";
import { useStockActions } from "../../hooks/useStockActions";
import { WatchlistActionsSection } from "./WatchlistActionsSection";
import { PortfolioActionsSection } from "./PortfolioActionsSection";
import { CopyActionsSection } from "./CopyActionsSection";

export interface StockActionsProps {
  stock: StockItem | WatchlistItem;
  watchlists: WatchlistArray;
  onWatchlistUpdate: () => void;
  showWatchlistActions?: boolean;
  onRemoveFromWatchlist?: (watchlistId: string, symbol: string) => void;
  onDeleteWatchlist?: (watchlistId: string, name: string) => void;
  watchlistId?: string;
}

export function StockActions({
  stock,
  watchlists,
  onWatchlistUpdate,
  showWatchlistActions = true,
  onRemoveFromWatchlist,
  onDeleteWatchlist,
  watchlistId,
}: StockActionsProps) {
  const { t, isStockInWatchlist, handleToggleWatchlist, handleCopySymbol, handleTogglePin } = useStockActions({
    stock,
    watchlists,
    onWatchlistUpdate,
    watchlistId,
  });

  // Memoize current watchlist to avoid repeated find operations
  const currentWatchlist = useMemo(() => {
    return watchlistId ? watchlists.find((w) => w.id === watchlistId) : undefined;
  }, [watchlistId, watchlists]);

  const shouldShowPortfolioActions = Boolean(onDeleteWatchlist && watchlistId);

  return (
    <ActionPanel>
      {showWatchlistActions && (
        <WatchlistActionsSection
          stock={stock}
          watchlists={watchlists}
          isStockInWatchlist={isStockInWatchlist}
          handleToggleWatchlist={handleToggleWatchlist}
          onWatchlistUpdate={onWatchlistUpdate}
          t={t}
        />
      )}

      {shouldShowPortfolioActions && currentWatchlist && (
        <PortfolioActionsSection
          watchlistId={watchlistId!}
          watchlists={watchlists}
          stock={stock}
          currentWatchlist={currentWatchlist}
          handleTogglePin={handleTogglePin}
          onWatchlistUpdate={onWatchlistUpdate}
          onRemoveFromWatchlist={onRemoveFromWatchlist!}
          onDeleteWatchlist={onDeleteWatchlist!}
          t={t}
        />
      )}

      <CopyActionsSection
        stock={stock}
        showWatchlistActions={showWatchlistActions}
        handleCopySymbol={handleCopySymbol}
        t={t}
      />

      <ActionPanel.Section title={t.actions.sectionTitle}>
        <Action
          title={t.settings.title}
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
