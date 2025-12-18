import { LocalStorage } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { HistoryItem } from "../types";

const HISTORY_KEY = "pronunciation-history";
const MAX_HISTORY_ITEMS = 20;

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
      if (stored) {
        const items: HistoryItem[] = JSON.parse(stored);
        setHistory(items);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToHistory = useCallback(async (word: string) => {
    const normalizedWord = word.trim().toLowerCase();
    if (!normalizedWord) return;

    setHistory((prevHistory) => {
      // Remove existing entry for this word
      const filtered = prevHistory.filter(
        (item) => item.word !== normalizedWord,
      );

      // Add new entry at the beginning
      const newHistory = [
        { word: normalizedWord, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_HISTORY_ITEMS);

      // Persist to storage
      LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory)).catch(
        console.error,
      );

      return newHistory;
    });
  }, []);

  const removeFromHistory = useCallback(async (word: string) => {
    setHistory((prevHistory) => {
      const newHistory = prevHistory.filter((item) => item.word !== word);
      LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory)).catch(
        console.error,
      );
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await LocalStorage.removeItem(HISTORY_KEY);
  }, []);

  return {
    history,
    isLoading,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
