import { getPreferenceValues, LocalStorage } from "@raycast/api";
import dedupe from "dedupe";
import { Preferences } from "../types/search";

export type HistoryType = "search" | "package";

export interface HistoryItem {
  term: string;
  type: HistoryType;
  description?: string;
}

class HistoryModel {
  private historyCount: number;
  private LOCAL_STORAGE_KEY = "anpm-history";

  constructor() {
    const { historyCount }: Preferences = getPreferenceValues();
    this.historyCount = Number(historyCount);
  }

  async getHistory() {
    const historyFromStorage = await LocalStorage.getItem<string>(this.LOCAL_STORAGE_KEY);
    const history: HistoryItem[] = JSON.parse(historyFromStorage ?? "[]");
    const historyWithoutDuplicates = dedupe(history);

    // 去重 + 缩减
    if (historyWithoutDuplicates.length > this.historyCount) {
      historyWithoutDuplicates.length = this.historyCount;
    }

    return historyWithoutDuplicates;
  }

  async addToHistory(item: HistoryItem) {
    const history = await this.getHistory();
    const historyWithNewItem = [item, ...history];
    const updatedHistoryList = [...new Set(historyWithNewItem)];

    if (updatedHistoryList.length > this.historyCount) {
      updatedHistoryList.length = this.historyCount;
    }

    await LocalStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(updatedHistoryList));

    return await this.getHistory();
  }

  private removeMatchingItemFromArray(arr: HistoryItem[], item: HistoryItem) {
    let i = 0;

    while (i < arr.length) {
      if (arr[i].term === item.term && arr[i].type === item.type) {
        arr.splice(i, 1);
      } else {
        ++i;
      }
    }

    return arr;
  }

  async removeItemFromHistory(item: HistoryItem) {
    const history = await this.getHistory();
    const updatedHistoryList = this.removeMatchingItemFromArray(history, item);

    await LocalStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(updatedHistoryList));

    return await this.getHistory();
  }

  async removeAllItemsFromHistory() {
    await LocalStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify([]));
    return await this.getHistory();
  }
}

export default new HistoryModel();
