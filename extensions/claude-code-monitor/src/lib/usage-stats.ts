import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  UsageStats,
  DailyStats,
  SessionMetadata,
  ProjectStats,
} from "../types";
import { formatTokens, normalizeModelName } from "./pricing";

const execFilePromise = promisify(execFile);

const CACHE_FILE = path.join(
  os.homedir(),
  ".claude",
  "claude-code-monitor",
  "usage-cache.json",
);

interface CacheEntry {
  mtime: number;
  turnCount: number;
  cost: number;
  model?: string;
  summary: string;
  firstMessage: string;
  gitBranch?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  id?: string;
  projectPath: string;
  projectName: string;
}

/**
 * Run the scanner in a subprocess to avoid Raycast memory limits.
 * The scanner reads JSONL files and writes results to cache.
 */
async function runScanner(afterDate: Date): Promise<void> {
  const scannerPath = path.join(__dirname, "scanner.js");
  await fs.promises.access(scannerPath);
  await execFilePromise("node", [scannerPath, String(afterDate.getTime())], {
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });
}

/**
 * Read sessions from the cache file (lightweight, no JSONL parsing).
 */
async function loadSessionsFromCache(
  afterDate: Date,
): Promise<SessionMetadata[]> {
  let cache: Record<string, CacheEntry>;
  try {
    const data = await fs.promises.readFile(CACHE_FILE, "utf8");
    cache = JSON.parse(data);
  } catch {
    return [];
  }

  const sessions: SessionMetadata[] = [];
  for (const [filePath, entry] of Object.entries(cache)) {
    const mtime = new Date(entry.mtime);
    if (mtime < afterDate) continue;

    sessions.push({
      id: entry.id || path.basename(filePath, ".jsonl"),
      filePath,
      projectPath: entry.projectPath || "",
      projectName: entry.projectName || path.basename(entry.projectPath || ""),
      summary: entry.summary || "",
      firstMessage: entry.firstMessage || "",
      lastModified: mtime,
      turnCount: entry.turnCount || 0,
      cost: entry.cost || 0,
      model: entry.model,
      gitBranch: entry.gitBranch,
      inputTokens: entry.inputTokens || undefined,
      outputTokens: entry.outputTokens || undefined,
      cacheReadTokens: entry.cacheReadTokens || undefined,
      cacheCreationTokens: entry.cacheCreationTokens || undefined,
    });
  }

  sessions.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  return sessions;
}

function calculateStats(sessions: SessionMetadata[]): UsageStats {
  let totalCostCents = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;

  const sessionsByProject: Record<string, ProjectStats> = {};
  const projectCostCents: Record<string, number> = {};
  const modelBreakdown: Record<string, { sessions: number; cost: number }> = {};

  for (const session of sessions) {
    const costCents = Math.round((session.cost || 0) * 10000);
    totalCostCents += costCents;
    totalInputTokens += session.inputTokens || 0;
    totalOutputTokens += session.outputTokens || 0;
    totalCacheReadTokens += session.cacheReadTokens || 0;
    totalCacheCreationTokens += session.cacheCreationTokens || 0;

    const pn = session.projectName;
    if (!sessionsByProject[pn]) {
      sessionsByProject[pn] = {
        count: 0,
        cost: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      projectCostCents[pn] = 0;
    }
    sessionsByProject[pn].count++;
    projectCostCents[pn] += costCents;
    sessionsByProject[pn].inputTokens += session.inputTokens || 0;
    sessionsByProject[pn].outputTokens += session.outputTokens || 0;

    const modelKey = session.model
      ? normalizeModelName(session.model)
      : "Unknown";
    if (!modelBreakdown[modelKey])
      modelBreakdown[modelKey] = { sessions: 0, cost: 0 };
    modelBreakdown[modelKey].sessions++;
    modelBreakdown[modelKey].cost += session.cost || 0;
  }

  for (const pn of Object.keys(sessionsByProject)) {
    sessionsByProject[pn].cost = projectCostCents[pn] / 10000;
  }

  const topSessions = [...sessions]
    .filter((s) => s.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  return {
    totalSessions: sessions.length,
    totalCost: totalCostCents / 10000,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheCreationTokens,
    sessionsByProject,
    modelBreakdown,
    topSessions,
  };
}

/**
 * Fetch all stats: run scanner subprocess, then read from cache.
 */
export async function getAllStats(days: number = 7): Promise<{
  today: UsageStats;
  week: UsageStats;
  month: UsageStats;
  daily: DailyStats[];
}> {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setMonth(monthStart.getMonth() - 1);
  monthStart.setHours(0, 0, 0, 0);

  // Run scanner in subprocess (writes to cache file)
  try {
    await runScanner(monthStart);
  } catch {
    // Scanner failed, try to use existing cache
  }

  // Read from cache (lightweight)
  const allSessions = await loadSessionsFromCache(monthStart);

  const todaySessions = allSessions.filter((s) => s.lastModified >= todayStart);
  const weekSessions = allSessions.filter((s) => s.lastModified >= weekStart);

  const dailyStats: DailyStats[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
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
      inputTokens: stats.totalInputTokens,
      outputTokens: stats.totalOutputTokens,
    });
  }

  return {
    today: calculateStats(todaySessions),
    week: calculateStats(weekSessions),
    month: calculateStats(allSessions),
    daily: dailyStats.reverse(),
  };
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function generateCostChart(dailyStats: DailyStats[]): string {
  const maxCost = Math.max(...dailyStats.map((d) => d.cost), 0.01);
  const barWidth = 20;

  let chart = "```\n";
  chart += "Daily Cost (last 7 days)\n";
  chart += "\u2500".repeat(35) + "\n";

  for (const day of dailyStats) {
    const date = day.date.slice(5);
    const barLength = Math.round((day.cost / maxCost) * barWidth);
    const bar =
      "\u2588".repeat(barLength) + "\u2591".repeat(barWidth - barLength);
    chart += `${date} \u2502${bar}\u2502 ${formatCost(day.cost)}\n`;
  }

  chart += "```";
  return chart;
}

export function generateProjectTable(
  sessionsByProject: Record<string, ProjectStats>,
): string {
  const sorted = Object.entries(sessionsByProject)
    .sort(([, a], [, b]) => b.cost - a.cost)
    .slice(0, 10);

  if (sorted.length === 0) return "No project data available.";

  let table = "| Project | Sessions | Cost | Input | Output |\n";
  table += "|---------|----------|------|-------|--------|\n";

  for (const [project, stats] of sorted) {
    table += `| ${project} | ${stats.count} | ${formatCost(stats.cost)} | ${formatTokens(stats.inputTokens)} | ${formatTokens(stats.outputTokens)} |\n`;
  }

  return table;
}

export function generateModelTable(
  modelBreakdown: Record<string, { sessions: number; cost: number }>,
): string {
  const sorted = Object.entries(modelBreakdown).sort(
    ([, a], [, b]) => b.cost - a.cost,
  );

  if (sorted.length === 0) return "No model data available.";

  let table = "| Model | Sessions | Est. Cost |\n";
  table += "|-------|----------|-----------|\n";

  for (const [model, stats] of sorted) {
    table += `| ${model} | ${stats.sessions} | ${formatCost(stats.cost)} |\n`;
  }

  return table;
}

export async function isClaudeActive(): Promise<boolean> {
  try {
    const { stdout } = await execFilePromise("pgrep", ["-x", "claude"]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
