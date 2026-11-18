import { environment } from "@raycast/api";
import { join } from "path";
import { usageStatsSchema, type UsageStats, type DailyStats } from "../schemas";
import { createConfigManager } from "./configManager";

export type { DailyStats, UsageStats };

const usageStatsManager = createConfigManager<UsageStats>({
  getConfigPath: () => join(environment.supportPath, "usage-stats.json"),
  defaultValue: {},
  schema: usageStatsSchema,
});

// In-memory cache
let cachedStats: UsageStats | null = null;
let writeTimeout: ReturnType<typeof setTimeout> | null = null;

const DEBOUNCE_MS = 500;

function getStats(): UsageStats {
  if (cachedStats === null) {
    cachedStats = usageStatsManager.load();
  }
  return cachedStats;
}

function scheduleSave(): void {
  if (writeTimeout) clearTimeout(writeTimeout);
  writeTimeout = setTimeout(() => {
    if (cachedStats) {
      usageStatsManager.save(cachedStats);
    }
    writeTimeout = null;
  }, DEBOUNCE_MS);
}

export function incrementUsage(aliasKey: string): void {
  const stats = getStats();
  const today = new Date().toISOString().split("T")[0];

  if (!stats[aliasKey]) {
    stats[aliasKey] = {};
  }

  stats[aliasKey][today] = (stats[aliasKey][today] || 0) + 1;
  scheduleSave();
}

export function getUsageStats(): UsageStats {
  return { ...getStats() }; // Return copy to prevent mutation
}

export function getUsageCount(aliasKey: string): number {
  const aliasStats = getStats()[aliasKey] || {};
  return Object.values(aliasStats).reduce((sum, count) => sum + count, 0);
}

// Force immediate flush (call on command exit if needed)
export function flushUsageStats(): void {
  if (writeTimeout) {
    clearTimeout(writeTimeout);
    writeTimeout = null;
  }
  if (cachedStats) {
    usageStatsManager.save(cachedStats);
  }
}
