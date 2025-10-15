import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "dock_switcher_history";

export interface DockItem {
  name: string;
  path: string;
  type: string;
}

export interface HistoryEntry {
  profileName: string;
  dockItems: DockItem[];
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

export const removeFromHistory = async (profileName: string): Promise<void> => {
  const history = await getHistory();
  const updatedHistory = history.filter((entry) => entry.profileName !== profileName);

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
};

export const existsInHistory = async (profileName: string): Promise<boolean> => {
  const history = await getHistory();
  return history.some((entry) => entry.profileName === profileName);
};

export const clearHistory = async (): Promise<void> => {
  await LocalStorage.clear();
};
