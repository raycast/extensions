import { Alert, Clipboard, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  HistoryItem,
  clearNonFavoriteHistory,
  loadHistory,
  removeHistoryItem,
  toggleFavorite,
  upsertHistoryItem,
} from "../core/storage";

export function useCommandHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const historyRef = useRef<HistoryItem[]>([]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const loadedHistory = await loadHistory();
      if (!isMounted) return;

      historyRef.current = loadedHistory;
      setHistory(loadedHistory);
      setIsLoading(false);
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const addCustomPrompt = async (prompt: string) => {
    const nextHistory = await upsertHistoryItem(historyRef.current, prompt);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
  };

  const handleToggleFavorite = async (prompt: string) => {
    const nextHistory = await toggleFavorite(historyRef.current, prompt);
    historyRef.current = nextHistory;
    setHistory(nextHistory);

    const item = nextHistory.find((entry) => entry.prompt === prompt);
    await showToast({
      style: Toast.Style.Success,
      title: item?.isFavorite ? "Favorited" : "Unfavorited",
    });
  };

  const deleteHistory = async (prompt: string) => {
    const nextHistory = await removeHistoryItem(historyRef.current, prompt);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    await showToast({
      style: Toast.Style.Success,
      title: "Record deleted",
    });
  };

  const clearHistory = async () => {
    const nonFavorites = historyRef.current.filter((item) => !item.isFavorite);
    if (nonFavorites.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No history to clear",
      });
      return;
    }

    if (
      !(await confirmAlert({
        title: "Clear History",
        message: "Are you sure you want to clear all history items except for your favorites?",
        primaryAction: {
          title: "Clear",
          style: Alert.ActionStyle.Destructive,
        },
      }))
    ) {
      return;
    }

    const nextHistory = await clearNonFavoriteHistory(historyRef.current);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    await showToast({
      style: Toast.Style.Success,
      title: "History cleared",
    });
  };

  const copyPrompt = async (prompt: string) => {
    await Clipboard.copy(prompt);
    await showToast({
      style: Toast.Style.Success,
      title: "Prompt copied",
    });
  };

  return {
    history,
    isLoading,
    addCustomPrompt,
    clearHistory,
    copyPrompt,
    deleteHistory,
    handleToggleFavorite,
  };
}
