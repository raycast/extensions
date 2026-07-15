import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chat } from "../types";

const HISTORY_KEY = "grammar-pro-history";

async function loadHistory(): Promise<Chat[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Chat[];
  } catch {
    return [];
  }
}

async function saveHistory(history: Chat[]): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function useHistory() {
  const [data, setData] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory().then((history) => {
      setData(history);
      setIsLoading(false);
    });
  }, []);

  const add = useCallback(async (chat: Chat) => {
    setData((prev) => {
      const updated = [chat, ...prev];
      saveHistory(updated);
      return updated;
    });
  }, []);

  const remove = useCallback(async (chat: Chat) => {
    setData((prev) => {
      const updated = prev.filter((item) => item.id !== chat.id);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clear = useCallback(async () => {
    setData([]);
    await saveHistory([]);
  }, []);

  return useMemo(
    () => ({ data, isLoading, add, remove, clear }),
    [data, isLoading, add, remove, clear],
  );
}
