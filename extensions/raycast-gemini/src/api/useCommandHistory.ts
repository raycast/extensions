import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";

export interface HistoryEntry {
  id: number;
  timestamp: string;
  prompt: string;
  response: string;
  model: string;
}

export function useCommandHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const storedHistory = await LocalStorage.getItem<string>("gemini_command_history");
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

  const addToHistory = async (prompt: string, response: string, modelUsed: string) => {
    try {
      const storedHistory = await LocalStorage.getItem<string>("gemini_command_history");
      const currentHistory: HistoryEntry[] = storedHistory ? JSON.parse(storedHistory) : [];

      const newEntry: HistoryEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        prompt,
        response,
        model: modelUsed,
      };

      const second = new Date(Date.now() - 1000).toISOString();
      const isDuplicate = currentHistory.some((entry) => entry.prompt === prompt && entry.timestamp > second);

      if (isDuplicate) {
        return;
      }
      const updatedHistory = [newEntry, ...currentHistory];
      await LocalStorage.setItem("gemini_command_history", JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
    } catch (error) {
      showFailureToast(error);
      console.error("Failed to add to command history:", error);
    }
  };

  const clearHistory = async () => {
    try {
      setHistory([]);
      await LocalStorage.removeItem("gemini_command_history");
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
