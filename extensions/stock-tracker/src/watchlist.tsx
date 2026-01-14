import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { ColumnPreferences } from "./types";
import { StockListItem } from "./components/StockListItem";
import { CreateWatchlistForm } from "./components/CreateWatchlistForm";
import { parseColumnOrder } from "./utils/column-helpers";
import { filterStocksByQuery } from "./utils/filter-helpers";
import { useWatchlistCommand } from "./hooks/useWatchlistCommand";

export default function WatchlistCommand() {
  const [searchQuery, setSearchQuery] = useState("");
  const {
    watchlists,
    selectedWatchlistId,
    setSelectedWatchlistId,
    isLoading,
    loadWatchlists,
    handleDeleteWatchlist,
    handleRemoveFromWatchlist,
    handleCreateWatchlist,
    handleTogglePin,
    t,
  } = useWatchlistCommand();

  const preferences = getPreferenceValues<ColumnPreferences>();
  const columnOrder = parseColumnOrder(preferences);

  const selectedWatchlist = watchlists.find((w) => w.id === selectedWatchlistId);
  const filteredStocks = selectedWatchlist ? filterStocksByQuery(selectedWatchlist.stocks, searchQuery) : [];

  if (watchlists.length === 0 && !isLoading) {
    return (
      <List
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.Push
              title={t.portfolio.createNewList}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<CreateWatchlistForm onSuccess={handleCreateWatchlist} />}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.List}
          title={t.portfolio.noWatchlistsTitle}
          description={t.portfolio.noWatchlistsDescription}
          actions={
            <ActionPanel>
              <Action.Push
                title={t.portfolio.createNewList}
                icon={Icon.Plus}
                target={<CreateWatchlistForm onSuccess={handleCreateWatchlist} />}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={selectedWatchlist ? `Search in ${selectedWatchlist.name}...` : "Search stocks..."}
      navigationTitle={
        selectedWatchlist ? `${selectedWatchlist.pinned ? "📌 " : ""}${selectedWatchlist.name}` : "Watchlists"
      }
      onSearchTextChange={setSearchQuery}
      filtering={false}
      searchBarAccessory={
        watchlists.length > 0 ? (
          <List.Dropdown
            tooltip="Select Watchlist - Pin with ⌘P"
            value={selectedWatchlistId || ""}
            onChange={(newValue) => setSelectedWatchlistId(newValue)}
          >
            {watchlists.map((watchlist) => (
              <List.Dropdown.Item
                key={watchlist.id}
                title={watchlist.pinned ? `📌 ${watchlist.name} (Pinned)` : watchlist.name}
                value={watchlist.id}
                keywords={[
                  watchlist.name,
                  watchlist.name.toLowerCase(),
                  t.portfolio.stockCount(watchlist.stocks.length),
                  watchlist.pinned ? "pinned" : "",
                ]}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.Push
            title={t.portfolio.createNewList}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<CreateWatchlistForm onSuccess={handleCreateWatchlist} />}
          />
        </ActionPanel>
      }
    >
      {selectedWatchlist ? (
        <>
          {filteredStocks.length === 0 && selectedWatchlist.stocks.length > 0 ? (
            <List.EmptyView
              icon={Icon.MagnifyingGlass}
              title="No results found"
              description={`No stocks match "${searchQuery}"`}
            />
          ) : filteredStocks.length === 0 ? (
            <List.EmptyView
              icon={Icon.List}
              title={t.portfolio.emptyListTitle}
              description={t.portfolio.emptyListDescription}
              actions={
                <ActionPanel>
                  {watchlists.length > 1 && (
                    <Action
                      icon={selectedWatchlist.pinned ? Icon.PinDisabled : Icon.Pin}
                      title={selectedWatchlist.pinned ? "Unpin Watchlist" : "Pin Watchlist"}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                      onAction={() => handleTogglePin(selectedWatchlist.id)}
                    />
                  )}
                  <Action.Push
                    title={t.portfolio.createNewList}
                    icon={Icon.Plus}
                    target={<CreateWatchlistForm onSuccess={handleCreateWatchlist} />}
                  />
                </ActionPanel>
              }
            />
          ) : (
            filteredStocks.map((stock) => (
              <StockListItem
                key={stock.symbol}
                stock={stock}
                columnOrder={columnOrder}
                t={t}
                watchlists={watchlists}
                onWatchlistUpdate={loadWatchlists}
                watchlistId={selectedWatchlist.id}
                onRemoveFromWatchlist={handleRemoveFromWatchlist}
                onDeleteWatchlist={handleDeleteWatchlist}
              />
            ))
          )}
        </>
      ) : (
        <List.EmptyView icon={Icon.List} title={t.portfolio.noWatchlistsTitle} />
      )}
    </List>
  );
}
