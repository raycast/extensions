import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chat } from "../types";

const HISTORY_KEY = "grammar-pro-history";

async function loadHistory(): Promise<Chat[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Chat[];
    const unique: Chat[] = [];
    const seen = new Set();
    for (const chat of parsed) {
      if (!seen.has(chat.id)) {
        seen.add(chat.id);
        unique.push(chat);
      }
    }
    return unique;
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
    const current = await loadHistory();
    const updated = [chat, ...current.filter((c) => c.id !== chat.id)];
    await saveHistory(updated);
    setData(updated);
  }, []);

  const remove = useCallback(async (chat: Chat) => {
    const current = await loadHistory();
    const updated = current.filter((item) => item.id !== chat.id);
    await saveHistory(updated);
    setData(updated);
  }, []);

  const clear = useCallback(async () => {
    await saveHistory([]);
    setData([]);
  }, []);

  return useMemo(
    () => ({ data, isLoading, add, remove, clear }),
    [data, isLoading, add, remove, clear],
  );
}
