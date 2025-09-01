import { StorageKey } from "../constants/storage";
import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { useBoolean } from "usehooks-ts";

export interface ChatHistoryEntry {
  id: number;
  timestamp: string;
  prompt: string;
  response: string;
  model: string;
}

export function useChatHistory() {
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const { value: isLoading, setFalse: stopLoading } = useBoolean(true);

  const loadHistory = useCallback(async () => {
    try {
      const storedHistory = (await LocalStorage.getItem(StorageKey.HISTORY)) as string;
      setHistory(JSON.parse(storedHistory || "[]"));
    } catch (error) {
      showFailureToast(error);
      console.error("Failed to load history", error);
    }
    stopLoading();
  }, [stopLoading]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addToHistory = useCallback(async (prompt: string, response: string, modelUsed: string) => {
    try {
      const storedHistory = (await LocalStorage.getItem(StorageKey.HISTORY)) as string;
      const history = JSON.parse(storedHistory || "[]") as ChatHistoryEntry[];

      const newEntry: ChatHistoryEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        prompt,
        response,
        model: modelUsed,
      };

      // only consider duplicate within one second
      const second = new Date(Date.now() - 1000).toISOString();
      const isDuplicate = history.some(entry => entry.prompt === prompt && entry.timestamp > second);

      if (!isDuplicate) {
        const updatedHistory = [newEntry, ...history];
        await LocalStorage.setItem(StorageKey.HISTORY, JSON.stringify(updatedHistory));
        setHistory(updatedHistory);
      }
    } catch (error) {
      showFailureToast(error);
      console.error("Failed to add to history", error);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await LocalStorage.removeItem(StorageKey.HISTORY);
      setHistory([]);
    } catch (error) {
      showFailureToast(error);
      console.error("Failed to clear history", error);
    }
  }, []);

  return { history, isLoading, addToHistory, clearHistory };
}
