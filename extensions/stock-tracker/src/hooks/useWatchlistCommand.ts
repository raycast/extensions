import { useState, useEffect } from "react";
import { useI18n } from "../locales";
import { getAllWatchlists, deleteWatchlist, removeStockFromWatchlist, togglePinWatchlist } from "../services/watchlist";
import { WatchlistArray } from "../types";
import { handleError, showSuccessToast } from "../utils/error-handling";

export function useWatchlistCommand() {
  const [watchlists, setWatchlists] = useState<WatchlistArray>([]);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    loadWatchlists();
  }, []);

  useEffect(() => {
    if (watchlists.length > 0 && !selectedWatchlistId) {
      const pinnedWatchlist = watchlists.find((w) => w.pinned);
      setSelectedWatchlistId(pinnedWatchlist?.id ?? watchlists[0].id);
    }
  }, [watchlists, selectedWatchlistId]);

  async function loadWatchlists() {
    try {
      const allWatchlists = await getAllWatchlists();
      setWatchlists(allWatchlists);
    } catch (error) {
      handleError(error, {
        title: t.common.error,
        message: "Failed to load watchlists",
        translations: t,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteWatchlist(watchlistId: string, name: string) {
    try {
      await deleteWatchlist(watchlistId);
      showSuccessToast(t.portfolio.deletedTitle, t.portfolio.deletedMessage(name));

      if (selectedWatchlistId === watchlistId) {
        const remainingWatchlists = watchlists.filter((w) => w.id !== watchlistId);
        setSelectedWatchlistId(remainingWatchlists.length > 0 ? remainingWatchlists[0].id : null);
      }

      await loadWatchlists();
    } catch (error) {
      handleError(error, {
        title: t.common.error,
        message: t.portfolio.deleteErrorMessage,
        translations: t,
      });
    }
  }

  async function handleRemoveFromWatchlist(watchlistId: string, symbol: string, stockName: string) {
    try {
      await removeStockFromWatchlist(watchlistId, symbol);
      showSuccessToast(t.portfolio.removedTitle, t.portfolio.removedMessage(stockName));
      await loadWatchlists();
    } catch (error) {
      handleError(error, {
        title: t.common.error,
        message: t.portfolio.removeErrorMessage,
        translations: t,
      });
    }
  }

  async function handleCreateWatchlist() {
    await loadWatchlists();
  }

  async function handleTogglePin(watchlistId: string) {
    try {
      await togglePinWatchlist(watchlistId);
      await loadWatchlists();
    } catch (error) {
      handleError(error, {
        title: t.common.error,
        message: "Failed to toggle pin",
        translations: t,
      });
    }
  }

  return {
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
  };
}
