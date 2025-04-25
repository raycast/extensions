import { ExtPreferences } from "./types";
import { StorageService } from "./storage";

export class HistoryService {
  private static readonly storage = new StorageService("history");

  static async saveToHistory(preferences: ExtPreferences, projectPath: string) {
    const historyLimit = preferences.recentlyOpenLimit || 0;
    const items = await HistoryService.storage.getItems();
    if (!items.includes(projectPath)) {
      items.push(projectPath);
      await HistoryService.storage.saveItems(items.slice(0, historyLimit));
    }
  }

  static async getHistory(): Promise<string[]> {
    return await HistoryService.storage.getItems();
  }

  static async clearHistory() {
    await HistoryService.storage.clearItems();
  }
}
