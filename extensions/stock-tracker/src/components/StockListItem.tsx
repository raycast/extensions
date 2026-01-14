import { List } from "@raycast/api";
import { StockItem, WatchlistItem, WatchlistArray } from "../types";
import { Translations } from "../locales";
import { buildAccessories } from "../utils/column-helpers";
import { ColumnType } from "../constants";
import { StockActions } from "./StockActions";
import { useStockListItem } from "../hooks/useStockListItem";

interface StockListItemProps {
  stock: StockItem | WatchlistItem;
  columnOrder: ColumnType[];
  t: Translations;
  watchlists: WatchlistArray;
  onWatchlistUpdate: () => void;
  watchlistId?: string;
  onRemoveFromWatchlist?: (watchlistId: string, symbol: string, stockName: string) => void;
  onDeleteWatchlist?: (watchlistId: string, name: string) => void;
}

export function StockListItem({
  stock,
  columnOrder,
  t,
  watchlists,
  onWatchlistUpdate,
  watchlistId,
  onRemoveFromWatchlist,
  onDeleteWatchlist,
}: StockListItemProps) {
  const { changeColor, icon, title, subtitle, keywords, handleRemove } = useStockListItem({
    stock,
    t,
    watchlistId,
    onRemoveFromWatchlist,
  });

  return (
    <List.Item
      key={`${watchlistId || ""}-${stock.symbol}`}
      title={title}
      subtitle={subtitle}
      icon={icon}
      keywords={keywords}
      accessories={buildAccessories(stock, columnOrder, changeColor, t)}
      actions={
        <StockActions
          stock={stock}
          watchlists={watchlists}
          onWatchlistUpdate={onWatchlistUpdate}
          showWatchlistActions={!watchlistId}
          watchlistId={watchlistId}
          onRemoveFromWatchlist={handleRemove}
          onDeleteWatchlist={onDeleteWatchlist}
        />
      }
    />
  );
}
