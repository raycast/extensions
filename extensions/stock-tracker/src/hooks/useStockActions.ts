import { useEffect } from "react";
import { StockItem, WatchlistItem, WatchlistArray } from "../types";
import { useI18n } from "../locales";
import { addStockToWatchlist, removeStockFromWatchlist, togglePinWatchlist } from "../services/watchlist";
import { handleError, showSuccessToast } from "../utils/error-handling";

interface UseStockActionsProps {
  stock: StockItem | WatchlistItem;
  watchlists: WatchlistArray;
  onWatchlistUpdate: () => void;
  watchlistId?: string;
}

export function useStockActions({ stock, watchlists, onWatchlistUpdate, watchlistId }: UseStockActionsProps) {
  const { t } = useI18n();

  useEffect(() => {
    async function loadDefaultWatchlist() {
      // Default watchlist logic can be added here if needed in the future
    }
    loadDefaultWatchlist();
  }, [watchlists]);

  const isStockInWatchlist = (id: string): boolean => {
    const watchlist = watchlists.find((w) => w.id === id);
    return watchlist ? watchlist.stocks.some((s) => s.symbol === stock.symbol) : false;
  };

  const handleToggleWatchlist = async (id: string) => {
    try {
      const isInList = isStockInWatchlist(id);

      if (isInList) {
        await removeStockFromWatchlist(id, stock.symbol);
        showSuccessToast(t.watchlist.removedTitle, t.watchlist.removedMessage(stock.name ?? stock.symbol));
      } else {
        await addStockToWatchlist(id, stock);
        showSuccessToast(t.watchlist.addedTitle, t.watchlist.addedMessage(stock.name ?? stock.symbol));
      }
      onWatchlistUpdate();
    } catch (error) {
      handleError(error, {
        title: t.watchlist.errorTitle,
        message: t.watchlist.errorMessage,
        translations: t,
      });
    }
  };

  const handleCopySymbol = () => {
    showSuccessToast(t.actions.copiedToClipboard, t.actions.symbolCopied(stock.symbol));
  };

  const handleTogglePin = async () => {
    if (!watchlistId) return;

    try {
      const watchlist = watchlists.find((w) => w.id === watchlistId);
      const wasPinned = watchlist?.pinned ?? false;

      await togglePinWatchlist(watchlistId);
      onWatchlistUpdate();

      showSuccessToast(
        wasPinned ? "Unpinned" : "Pinned",
        wasPinned ? "Watchlist unpinned" : "Watchlist pinned - will open by default",
      );
    } catch (error) {
      handleError(error, {
        title: t.common.error,
        message: "Failed to toggle pin",
        translations: t,
      });
    }
  };

  return {
    t,
    isStockInWatchlist,
    handleToggleWatchlist,
    handleCopySymbol,
    handleTogglePin,
  };
}
