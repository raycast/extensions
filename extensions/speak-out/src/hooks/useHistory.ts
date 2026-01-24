/**
 * Search history management hook using Raycast LocalStorage.
 * @module hooks/useHistory
 */

import { LocalStorage } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { HistoryItem } from "../types";
import { HISTORY_KEY, MAX_HISTORY_ITEMS } from "../constants";

/**
 * Hook for managing search history with persistence.
 *
 * Features:
 * - Persists history to Raycast LocalStorage
 * - Limits history to most recent 20 items
 * - Prevents duplicate entries (moves existing to top)
 * - Normalizes words to lowercase
 *
 * @returns History state and management functions
 *
 * @example
 * const { history, addToHistory, clearHistory } = useHistory();
 * await addToHistory("example");
 */
export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Adds a word to history. If word exists, moves it to the top.
   * Automatically persists to LocalStorage.
   */
  const addToHistory = useCallback(async (word: string) => {
    const normalizedWord = word.trim().toLowerCase();
    if (!normalizedWord) return;

    setHistory((prevHistory) => {
      const filtered = prevHistory.filter(
        (item) => item.word !== normalizedWord,
      );
      const newHistory = [
        { word: normalizedWord, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_HISTORY_ITEMS);

      LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory)).catch(
        console.error,
      );

      return newHistory;
    });
  }, []);

  /**
   * Removes a specific word from history.
   */
  const removeFromHistory = useCallback(async (word: string) => {
    setHistory((prevHistory) => {
      const newHistory = prevHistory.filter((item) => item.word !== word);
      LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory)).catch(
        console.error,
      );
      return newHistory;
    });
  }, []);

  /**
   * Clears all history items.
   */
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
