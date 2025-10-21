import { IPinfo } from "node-ipinfo";
import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "ip_info_history";

export interface HistoryEntry {
  ip: string;
  info: IPinfo;
  timestamp: number;
}

export const getHistory = async () => {
  const historyJson = await LocalStorage.getItem<string>(STORAGE_KEY);

  return historyJson ? (JSON.parse(historyJson) as HistoryEntry[]) : [];
};

export const addToHistory = async (entry: HistoryEntry): Promise<void> => {
  const history = await getHistory();
  const updatedHistory = [entry, ...history];

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
};

export const clearHistory = async (): Promise<void> => {
  await LocalStorage.clear();
};
