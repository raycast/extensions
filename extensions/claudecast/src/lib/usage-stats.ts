import { LocalStorage } from "@raycast/api";
import { listAllSessions, SessionMetadata } from "./session-parser";

export interface UsageStats {
  totalSessions: number;
  totalCost: number;
  sessionsByProject: Record<string, { count: number; cost: number }>;
  topSessions: SessionMetadata[];
}

export interface DailyStats {
  date: string;
  sessions: number;
  cost: number;
}

const STATS_CACHE_KEY = "claudecast-stats-cache";
const STATS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// In-memory cache for today's stats to prevent repeated disk reads
// This is especially important for menu bar monitors that refresh frequently
let todayStatsCache: {
  stats: UsageStats;
  timestamp: number;
  date: string;
} | null = null;
const TODAY_STATS_CACHE_TTL = 30 * 1000; // 30 seconds

interface CachedStats {
  stats: UsageStats;
  timestamp: number;
}

/**
 * Get usage statistics for today
 * Uses in-memory caching to prevent repeated disk reads (important for menu bar)
 * Also uses date filtering to only parse today's session files
 */
export async function getTodayStats(): Promise<UsageStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Check in-memory cache
  if (
    todayStatsCache &&
    todayStatsCache.date === todayStr &&
    Date.now() - todayStatsCache.timestamp < TODAY_STATS_CACHE_TTL
  ) {
    return todayStatsCache.stats;
  }

  // Only load sessions modified today - much more efficient
  const todaySessions = await listAllSessions({ afterDate: today });
  const stats = calculateStats(todaySessions);

  // Update in-memory cache
  todayStatsCache = {
    stats,
    timestamp: Date.now(),
    date: todayStr,
  };

  return stats;
}

/**
 * Get usage statistics for this week
 */
export async function getWeekStats(): Promise<UsageStats> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  // Only load sessions from the past week
  const weekSessions = await listAllSessions({ afterDate: weekAgo });

  return calculateStats(weekSessions);
}

/**
 * Get usage statistics for this month
 */
export async function getMonthStats(): Promise<UsageStats> {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  monthAgo.setHours(0, 0, 0, 0);

  // Only load sessions from the past month
  const monthSessions = await listAllSessions({ afterDate: monthAgo });

  return calculateStats(monthSessions);
}

/**
 * Get all-time usage statistics (cached)
 */
export async function getAllTimeStats(): Promise<UsageStats> {
  // Check cache
  const cached = await LocalStorage.getItem<string>(STATS_CACHE_KEY);
  if (cached) {
    const cachedStats: CachedStats = JSON.parse(cached);
    if (Date.now() - cachedStats.timestamp < STATS_CACHE_TTL) {
      return cachedStats.stats;
    }
  }

  // Calculate fresh stats (cap at 1000 most recent to prevent OOM)
  const allSessions = await listAllSessions({ limit: 1000 });
  const stats = calculateStats(allSessions);

  // Cache the result
  await LocalStorage.setItem(
    STATS_CACHE_KEY,
    JSON.stringify({
      stats,
      timestamp: Date.now(),
    }),
  );

  return stats;
}

/**
 * Invalidate the stats cache
 * Call this after creating/deleting sessions to ensure fresh data
 */
export async function invalidateStatsCache(): Promise<void> {
  await LocalStorage.removeItem(STATS_CACHE_KEY);
}

/**
 * Get daily stats for the last N days
 * Optimized to only load sessions from the requested time range
 */
export async function getDailyStats(days: number = 7): Promise<DailyStats[]> {
  // Calculate the earliest date we need
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  // Only load sessions from the requested period
  const allSessions = await listAllSessions({ afterDate: startDate });

  const dailyStats: DailyStats[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const daySessions = allSessions.filter(
      (s) => s.lastModified >= date && s.lastModified < nextDate,
    );

    const stats = calculateStats(daySessions);

    dailyStats.push({
      date: date.toISOString().split("T")[0],
      sessions: stats.totalSessions,
      cost: stats.totalCost,
    });
  }

  return dailyStats.reverse();
}

/**
 * Calculate stats from a list of sessions
 * Uses integer cents internally to avoid floating point precision errors
 */
function calculateStats(sessions: SessionMetadata[]): UsageStats {
  let totalCostCents = 0;
  const sessionsByProject: Record<string, { count: number; cost: number }> = {};
  const projectCostCents: Record<string, number> = {};

  for (const session of sessions) {
    // Convert to cents (integer) to avoid floating point errors
    const costCents = Math.round((session.cost || 0) * 10000);
    totalCostCents += costCents;

    // Group by project
    if (!sessionsByProject[session.projectName]) {
      sessionsByProject[session.projectName] = { count: 0, cost: 0 };
      projectCostCents[session.projectName] = 0;
    }
    sessionsByProject[session.projectName].count++;
    projectCostCents[session.projectName] += costCents;
  }

  // Convert project costs back to dollars
  for (const projectName of Object.keys(sessionsByProject)) {
    sessionsByProject[projectName].cost = projectCostCents[projectName] / 10000;
  }

  // Sort sessions by cost to get top expensive ones
  const topSessions = [...sessions]
    .filter((s) => s.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  return {
    totalSessions: sessions.length,
    totalCost: totalCostCents / 10000, // Convert back to dollars
    sessionsByProject,
    topSessions,
  };
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Generate ASCII bar chart for daily costs
 */
export function generateCostChart(dailyStats: DailyStats[]): string {
  const maxCost = Math.max(...dailyStats.map((d) => d.cost), 0.01);
  const barWidth = 20;

  let chart = "```\n";
  chart += "Daily Cost (last 7 days)\n";
  chart += "─".repeat(35) + "\n";

  for (const day of dailyStats) {
    const date = day.date.slice(5); // MM-DD
    const barLength = Math.round((day.cost / maxCost) * barWidth);
    const bar = "█".repeat(barLength) + "░".repeat(barWidth - barLength);
    chart += `${date} │${bar}│ ${formatCost(day.cost)}\n`;
  }

  chart += "```";
  return chart;
}

/**
 * Generate project breakdown table
 */
export function generateProjectTable(
  sessionsByProject: Record<string, { count: number; cost: number }>,
): string {
  const sorted = Object.entries(sessionsByProject)
    .sort(([, a], [, b]) => b.cost - a.cost)
    .slice(0, 10);

  if (sorted.length === 0) {
    return "No project data available.";
  }

  let table = "| Project | Sessions | Cost |\n";
  table += "|---------|----------|------|\n";

  for (const [project, stats] of sorted) {
    table += `| ${project} | ${stats.count} | ${formatCost(stats.cost)} |\n`;
  }

  return table;
}

/**
 * Check if there's an active Claude Code process
 */
export async function isClaudeActive(): Promise<boolean> {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execPromise = promisify(exec);

    const { stdout } = await execPromise("pgrep -x claude || true");
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
