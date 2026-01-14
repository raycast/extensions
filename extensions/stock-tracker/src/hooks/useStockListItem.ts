import { StockItem, WatchlistItem } from "../types";
import { Translations } from "../locales";
import { getChangeIntensityColor, getStockIcon, formatStockSubtitle, getMarketColor } from "../utils/stock-helpers";
import { truncateText } from "../utils/formatting";
import { extractStockKeywords } from "../utils/filter-helpers";
import { DISPLAY_CONSTANTS } from "../constants";

interface UseStockListItemProps {
  stock: StockItem | WatchlistItem;
  t: Translations;
  watchlistId?: string;
  onRemoveFromWatchlist?: (watchlistId: string, symbol: string, stockName: string) => void;
}

export function useStockListItem({ stock, t, watchlistId, onRemoveFromWatchlist }: UseStockListItemProps) {
  const changeColor = getChangeIntensityColor(stock.changePercent);
  const marketColor = getMarketColor(stock.market);
  const icon = getStockIcon(stock, marketColor);

  // Title: Symbol (EXCHANGE:SYMBOL format)
  const title =
    "exchange" in stock
      ? formatStockSubtitle(stock as StockItem, t.common.defaultExchange, DISPLAY_CONSTANTS.MAX_TITLE_LENGTH)
      : truncateText(stock.symbol, DISPLAY_CONSTANTS.MAX_TITLE_LENGTH);

  // Subtitle: Description (company name)
  const subtitle = truncateText(stock.name ?? stock.symbol, DISPLAY_CONSTANTS.MAX_SUBTITLE_LENGTH);

  // Extract search keywords
  const keywords = extractStockKeywords(stock);

  const handleRemove =
    watchlistId && onRemoveFromWatchlist
      ? (id: string, symbol: string) => onRemoveFromWatchlist(id, symbol, stock.name ?? symbol)
      : undefined;

  return {
    changeColor,
    icon,
    title,
    subtitle,
    keywords,
    handleRemove,
  };
}
