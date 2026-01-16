import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chat, HistoryHook } from "../type";
import {
  addToHistory,
  removeFromHistory,
  clearHistory as clearHistorySingleton,
  getHistory,
  getHistorySync,
  isHistoryLoading,
} from "./useHistorySingleton";

export function useHistory(): HistoryHook {
  const [data, setData] = useState<Chat[]>(() => getHistorySync());
  const [isLoading, setLoading] = useState<boolean>(isHistoryLoading());

  useEffect(() => {
    (async () => {
      const history = await getHistory();
      setData(history);
      setLoading(false);
    })();
  }, []);

  const add = useCallback(async (chat: Chat) => {
    await addToHistory(chat);
    const updatedHistory = await getHistory();
    setData(updatedHistory);
  }, []);

  const remove = useCallback(async (answer: Chat) => {
    const toast = await showToast({
      title: "Removing answer...",
      style: Toast.Style.Animated,
    });
    await removeFromHistory(answer.id);
    const updatedHistory = await getHistory();
    setData(updatedHistory);
    toast.title = "Answer removed!";
    toast.style = Toast.Style.Success;
  }, []);

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing history...",
      style: Toast.Style.Animated,
    });
    await clearHistorySingleton();
    setData([]);
    toast.title = "History cleared!";
    toast.style = Toast.Style.Success;
  }, []);

  return useMemo(() => ({ data, isLoading, add, remove, clear }), [data, isLoading, add, remove, clear]);
}
