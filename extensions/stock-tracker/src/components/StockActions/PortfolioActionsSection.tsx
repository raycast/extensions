import React from "react";
import { ActionPanel, Action, Icon } from "@raycast/api";
import { StockItem, WatchlistItem, Watchlist, WatchlistArray } from "../../types";
import { CreateWatchlistForm } from "../CreateWatchlistForm";
import { RenameWatchlistForm } from "../RenameWatchlistForm";
import { useStockActions } from "../../hooks/useStockActions";

export interface PortfolioActionsSectionProps {
  watchlistId: string;
  watchlists: WatchlistArray;
  stock: StockItem | WatchlistItem;
  currentWatchlist: Watchlist | undefined;
  handleTogglePin: () => void;
  onWatchlistUpdate: () => void;
  onRemoveFromWatchlist: (watchlistId: string, symbol: string) => void;
  onDeleteWatchlist: (watchlistId: string, name: string) => void;
  t: ReturnType<typeof useStockActions>["t"];
}

export function PortfolioActionsSection({
  watchlistId,
  watchlists,
  stock,
  currentWatchlist,
  handleTogglePin,
  onWatchlistUpdate,
  onRemoveFromWatchlist,
  onDeleteWatchlist,
  t,
}: PortfolioActionsSectionProps) {
  const canPin = watchlists.length > 1;
  const isPinned = currentWatchlist?.pinned ?? false;

  return (
    <ActionPanel.Section title={t.portfolio.listActionsTitle}>
      <Action.Push
        icon={Icon.Plus}
        title={t.portfolio.createNewList}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<CreateWatchlistForm onSuccess={onWatchlistUpdate} />}
      />
      {canPin && (
        <Action
          icon={isPinned ? Icon.PinDisabled : Icon.Pin}
          title={isPinned ? t.portfolio.unpinTitle : t.portfolio.pinTitle}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
          onAction={handleTogglePin}
        />
      )}
      <Action.Push
        icon={Icon.Pencil}
        title={t.portfolio.renameTitle}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        target={
          <RenameWatchlistForm
            watchlistId={watchlistId}
            currentName={currentWatchlist?.name ?? ""}
            onSuccess={onWatchlistUpdate}
          />
        }
      />
      <Action
        title={t.portfolio.removeFromListTitle}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        onAction={() => onRemoveFromWatchlist(watchlistId, stock.symbol)}
      />
      <Action
        title={t.portfolio.deleteListTitle}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={() => {
          if (currentWatchlist) {
            onDeleteWatchlist(watchlistId, currentWatchlist.name);
          }
        }}
      />
    </ActionPanel.Section>
  );
}
