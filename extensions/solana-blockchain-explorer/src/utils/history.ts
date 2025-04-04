import { LocalStorage } from "@raycast/api";
import { Network } from "./solana";

export interface SearchHistoryItem {
  query: string;
  type: string;
  timestamp: number;
}

export const HISTORY_KEY = "solana-search-history";
const NETWORK_KEY = "solana-network";
const MAX_HISTORY_ITEMS = 50;

export async function addToHistory(query: string, type: string) {
  const history = await getHistory();
  const newItem: SearchHistoryItem = {
    query,
    type,
    timestamp: Date.now(),
  };

  // Remove duplicate entries
  const filteredHistory = history.filter((item) => item.query !== query);

  // Add new item at the beginning
  filteredHistory.unshift(newItem);

  // Keep only the most recent items
  const trimmedHistory = filteredHistory.slice(0, MAX_HISTORY_ITEMS);

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
}

export async function getHistory(): Promise<SearchHistoryItem[]> {
  const historyJson = await LocalStorage.getItem<string>(HISTORY_KEY);
  return historyJson ? JSON.parse(historyJson) : [];
}

export async function clearHistory() {
  await LocalStorage.removeItem(HISTORY_KEY);
}

export async function getLastNetwork(): Promise<Network> {
  const network = await LocalStorage.getItem<string>(NETWORK_KEY);
  return (network as Network) || "mainnet";
}

export async function setLastNetwork(network: Network) {
  await LocalStorage.setItem(NETWORK_KEY, network);
}
