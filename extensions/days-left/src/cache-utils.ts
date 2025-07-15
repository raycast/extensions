import { Cache } from "@raycast/api";
import { CACHE_CONFIG } from "./constants";

export interface Goal {
  id: string;
  title: string;
  targetDate: Date;
  reward: string;
  completed: boolean;
}

export interface CachedData {
  goals: Goal[];
  startDate: string;
  lastUpdated: string;
}

const cache = new Cache();

export class CacheManager {
  static saveData(goals: Goal[], startDate: Date): void {
    const data: CachedData = {
      goals,
      startDate: startDate.toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    cache.set(CACHE_CONFIG.KEY, JSON.stringify(data));
  }

  static loadData(): CachedData | null {
    const cached = cache.get(CACHE_CONFIG.KEY);
    if (cached) {
      try {
        const data: CachedData = JSON.parse(cached);
        // Parse dates back to Date objects
        data.goals = data.goals.map((goal) => ({
          ...goal,
          targetDate: new Date(goal.targetDate),
        }));
        return data;
      } catch (error) {
        console.error("Failed to parse cached data:", error);
        return null;
      }
    }
    return null;
  }

  static clearCache(): void {
    cache.clear();
  }

  static hasCachedData(): boolean {
    return cache.has(CACHE_CONFIG.KEY);
  }

  static getLastUpdated(): Date | null {
    const data = this.loadData();
    return data ? new Date(data.lastUpdated) : null;
  }

  static isDataStale(maxAgeHours: number = 24): boolean {
    const lastUpdated = this.getLastUpdated();
    if (!lastUpdated) return true;

    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    return hoursDiff > maxAgeHours;
  }
}
