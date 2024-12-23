import { LocalStorage } from "@raycast/api";

interface UsageStats {
  itemId: string;
  lastUsed: number;
  useCount: number;
}

const USAGE_STATS_KEY = "cursor-usage-stats";

export class UsageStatsManager {
  private static async getStats(): Promise<UsageStats[]> {
    const stats = await LocalStorage.getItem<string>(USAGE_STATS_KEY);
    return stats ? JSON.parse(stats) : [];
  }

  private static async saveStats(stats: UsageStats[]): Promise<void> {
    await LocalStorage.setItem(USAGE_STATS_KEY, JSON.stringify(stats));
  }

  static async trackUsage(itemId: string): Promise<void> {
    const stats = await this.getStats();
    const existingItem = stats.find((item) => item.itemId === itemId);
    const now = Date.now();

    if (existingItem) {
      existingItem.lastUsed = now;
      existingItem.useCount++;
    } else {
      stats.push({ itemId, lastUsed: now, useCount: 1 });
    }

    await this.saveStats(stats);
  }

  static async getFrequentlyUsed(limit: number): Promise<string[]> {
    const stats = await this.getStats();
    return stats
      .sort((a, b) => {
        // Sort by use count first, then by last used time
        if (b.useCount !== a.useCount) {
          return b.useCount - a.useCount;
        }
        return b.lastUsed - a.lastUsed;
      })
      .slice(0, limit)
      .map((item) => item.itemId);
  }

  static async reset(): Promise<void> {
    await LocalStorage.removeItem(USAGE_STATS_KEY);
  }

  static async hasUsageHistory(): Promise<boolean> {
    const stats = await this.getStats();
    return stats.length > 0;
  }
}
