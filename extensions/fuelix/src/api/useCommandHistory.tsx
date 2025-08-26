import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";

/**
 * Custom hook to manage command history with proper React state management
 * @returns {Object} History management functions and state
 */
export function useCommandHistory() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history on component mount
  useEffect(() => {
    loadHistory();
  }, []);

  /**
   * Load command history from LocalStorage
   */
  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const storedHistory = await LocalStorage.getItem("fuelix_command_history");
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
      setIsLoading(false);
    } catch (error) {
      showFailureToast(error);
      console.error("Failed to load command history:", error);
      setIsLoading(false);
    }
  };

  /**
   * Add a new entry to command history
   * @param {string} prompt - The user's prompt
   * @param {string} response - Fuelix's response
   * @param {string} modelUsed - The model used for this query
   */
  const addToHistory = async (prompt, response, modelUsed) => {
    try {
      // Use current history state instead of reading from LocalStorage
      // This avoids race conditions and improves performance
      const currentHistory = history;

      const newEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        prompt,
        response,
        model: modelUsed,
      };

      // only consider duplicate within one second
      const second = new Date(Date.now() - 1000).toISOString();
      const isDuplicate = currentHistory.some(
        (entry) =>
          entry.prompt === prompt &&
          // Only consider entries from the last 5 minutes as potential duplicates
          entry.timestamp > second,
      );

      if (isDuplicate) {
        return;
      }
      // Update with new entry
      const updatedHistory = [newEntry, ...currentHistory];
      // Store in LocalStorage first to ensure persistence
      await LocalStorage.setItem("fuelix_command_history", JSON.stringify(updatedHistory));
      // Then update state to reflect changes
      setHistory(updatedHistory);
    } catch (error) {
      showFailureToast(error);
      console.error("Failed to add to command history:", error);
    }
  };

  /**
   * Clear all command history
   */
  const clearHistory = async () => {
    try {
      setHistory([]);
      await LocalStorage.removeItem("fuelix_command_history");
    } catch (error) {
      showFailureToast(error);
      console.error("Failed to clear command history:", error);
    }
  };

  return {
    history,
    isLoading,
    addToHistory,
    clearHistory,
    loadHistory,
  };
}
