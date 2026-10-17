import { LocalStorage } from "@raycast/api";
import { Chat } from "../type";

let historyCache: Chat[] | null = null;
let isLoading = false;
let loadPromise: Promise<Chat[]> | null = null;

async function loadHistory(): Promise<Chat[]> {
  if (historyCache !== null) {
    return historyCache;
  }

  if (loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      const storedHistory = await LocalStorage.getItem<string>("history");

      if (storedHistory) {
        try {
          const parsed = JSON.parse(storedHistory);
          historyCache = parsed;
          return parsed;
        } catch (error) {
          console.log("[DEBUG] Failed to parse stored history, using empty array", error);
          historyCache = [];
          return [];
        }
      }

      historyCache = [];
      return [];
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

async function saveHistory(data: Chat[]): Promise<void> {
  historyCache = data;
  await LocalStorage.setItem("history", JSON.stringify(data));
}

export async function addToHistory(chat: Chat): Promise<void> {
  const history = await loadHistory();
  const newHistory = [...history, chat];
  await saveHistory(newHistory);
}

export async function removeFromHistory(chatId: string): Promise<void> {
  const history = await loadHistory();
  const newHistory = history.filter((item) => item.id !== chatId);
  await saveHistory(newHistory);
}

export async function clearHistory(): Promise<void> {
  await saveHistory([]);
}

export async function getHistory(): Promise<Chat[]> {
  return loadHistory();
}

export function getHistorySync(): Chat[] {
  return historyCache || [];
}

export function isHistoryLoading(): boolean {
  return isLoading;
}
