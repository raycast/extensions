import React from "react";
import { ActionPanel, Action, Icon, Color } from "@raycast/api";
import { StockItem, WatchlistItem, WatchlistArray } from "../../types";
import { CreateWatchlistForm } from "../CreateWatchlistForm";
import { useStockActions } from "../../hooks/useStockActions";

export interface WatchlistActionsSectionProps {
  stock: StockItem | WatchlistItem;
  watchlists: WatchlistArray;
  isStockInWatchlist: (id: string) => boolean;
  handleToggleWatchlist: (id: string) => void;
  onWatchlistUpdate: () => void;
  t: ReturnType<typeof useStockActions>["t"];
}

export function WatchlistActionsSection({
  stock,
  watchlists,
  isStockInWatchlist,
  handleToggleWatchlist,
  onWatchlistUpdate,
  t,
}: WatchlistActionsSectionProps) {
  return (
    <ActionPanel.Section title={t.watchlist.sectionTitle}>
      <ActionPanel.Submenu
        icon={Icon.List}
        title={t.watchlist.addRemoveTitle}
        shortcut={{ modifiers: [], key: "enter" }}
      >
        {watchlists.map((watchlist) => {
          const isInList = isStockInWatchlist(watchlist.id);
          return (
            <Action
              key={watchlist.id}
              title={watchlist.name}
              icon={{
                source: Icon.Bookmark,
                tintColor: isInList ? Color.Blue : Color.SecondaryText,
              }}
              onAction={() => handleToggleWatchlist(watchlist.id)}
            />
          );
        })}
        <Action.Push
          title={t.watchlist.createNewTitle}
          icon={Icon.Plus}
          target={<CreateWatchlistForm stockToAdd={stock} mode="createAndAdd" onSuccess={onWatchlistUpdate} />}
        />
      </ActionPanel.Submenu>
    </ActionPanel.Section>
  );
}
