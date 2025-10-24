import { LocalStorage } from "@raycast/api";

interface HistoryItem {
  word: string;
  timestamp: number;
}

export async function addToHistory(word: string): Promise<void> {
  try {
    const historyData = await LocalStorage.getItem<string>("search-history");
    let history: HistoryItem[] = [];

    if (historyData) {
      history = JSON.parse(historyData) as HistoryItem[];
    }

    history.push({
      word,
      timestamp: Date.now(),
    });

    if (history.length > 108) {
      history = history.slice(-108);
    }

    await LocalStorage.setItem("search-history", JSON.stringify(history));
  } catch {
    // Silently fail if history can't be saved
  }
}
