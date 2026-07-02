import { LocalStorage } from "@raycast/api";
import {
  listAllSessions,
  streamSessionUsage,
  MessageUsage,
  SessionMetadata,
  SessionUsage,
} from "./session-parser";

/**
 * Lightweight projection of a session, used for "Top Sessions" lists in
 * UsageStats. Avoids retaining the full SessionMetadata reference inside the
 * cached stats object (which previously aliased the same memory across the
 * in-memory cache and React state).
 */
export interface TopSessionSummary {
  id: string;
  projectName: string;
  firstMessage: string;
  cost: number;
}

export interface UsageStats {
  totalSessions: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  sessionsByProject: Record<string, { count: number; cost: number }>;
  topSessions: TopSessionSummary[];
}

/**
 * Per-model pricing. Rows are matched by substring against `usage.model`,
 * most-specific first. Sonnet 4.x has a 200K-input-token tier where the rate
 * doubles. The tier applies per-message (per-request), not per-session, so a
 * session with several messages each below 200K still pays the base rate.
 *
 * Pricing source: https://docs.anthropic.com/en/docs/about-claude/pricing
 */
interface Pricing {
  match: string;
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok: number;
  cacheWritePerMTok: number;
  /** Optional tier applied to per-message tokens above thresholdTokens. */
  tier?: {
    thresholdTokens: number;
    inputPerMTok: number;
    outputPerMTok: number;
    cacheReadPerMTok: number;
    cacheWritePerMTok: number;
  };
}

const MODEL_PRICING: Pricing[] = [
  // Opus 4.7 (latest, $5/$25 tier). MUST come before bare "opus" so substring
  // match resolves here first; without this row, opus-4-7 sessions fall through
  // to the older $15/$75 "opus" row.
  {
    match: "opus-4-7",
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheWritePerMTok: 6.25,
  },
  // Opus 4.5/4.6 ($5/$25 tier)
  {
    match: "opus-4-5",
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheWritePerMTok: 6.25,
  },
  {
    match: "opus-4-6",
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheWritePerMTok: 6.25,
  },
  // Opus 4.1 (older $15/$75 tier)
  {
    match: "opus-4-1",
    inputPerMTok: 15,
    outputPerMTok: 75,
    cacheReadPerMTok: 1.5,
    cacheWritePerMTok: 18.75,
  },
  // Opus 4 / generic opus fallback ($15/$75 tier)
  {
    match: "opus",
    inputPerMTok: 15,
    outputPerMTok: 75,
    cacheReadPerMTok: 1.5,
    cacheWritePerMTok: 18.75,
  },
  // Sonnet 4.x: 200K-token tier doubles the rate above the threshold.
  {
    match: "sonnet",
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheWritePerMTok: 3.75,
    tier: {
      thresholdTokens: 200_000,
      inputPerMTok: 6,
      outputPerMTok: 22.5,
      cacheReadPerMTok: 0.6,
      cacheWritePerMTok: 7.5,
    },
  },
  // Haiku 4.5 ($1/$5 tier)
  {
    match: "haiku-4",
    inputPerMTok: 1,
    outputPerMTok: 5,
    cacheReadPerMTok: 0.1,
    cacheWritePerMTok: 1.25,
  },
  // Haiku 3.5 ($0.80/$4 tier)
  {
    match: "haiku",
    inputPerMTok: 0.8,
    outputPerMTok: 4,
    cacheReadPerMTok: 0.08,
    cacheWritePerMTok: 1,
  },
];

const DEFAULT_PRICING = MODEL_PRICING.find((p) => p.match === "sonnet")!;

function resolvePricing(model?: string): Pricing {
  if (!model) return DEFAULT_PRICING;
  const lower = model.toLowerCase();
  for (const pricing of MODEL_PRICING) {
    if (lower.includes(pricing.match)) return pricing;
  }
  return DEFAULT_PRICING;
}

/**
 * Compute the cost of a single deduplicated message using tier-aware pricing.
 * The streaming-chunk dedup inside streamSessionUsage ensures `msg` represents
 * the cumulative final usage for one request, not double-counted chunks.
 *
 * Per Anthropic, the 200K-token tier is keyed on *input tokens per request*:
 * if a single request crosses the threshold, ALL token types (input, output,
 * cache read, cache write) bill at the high-tier flat rate for that request.
 * The high tier is not a split-at-threshold calculation per token type.
 */
function calculateMessageCost(msg: MessageUsage): number {
  const p = resolvePricing(msg.model);
  const inHighTier =
    p.tier !== undefined && msg.inputTokens > p.tier.thresholdTokens;
  const inputRate = inHighTier ? p.tier!.inputPerMTok : p.inputPerMTok;
  const outputRate = inHighTier ? p.tier!.outputPerMTok : p.outputPerMTok;
  const cacheReadRate = inHighTier
    ? p.tier!.cacheReadPerMTok
    : p.cacheReadPerMTok;
  const cacheWriteRate = inHighTier
    ? p.tier!.cacheWritePerMTok
    : p.cacheWritePerMTok;
  return (
    (msg.inputTokens / 1_000_000) * inputRate +
    (msg.outputTokens / 1_000_000) * outputRate +
    (msg.cacheReadTokens / 1_000_000) * cacheReadRate +
    (msg.cacheCreationTokens / 1_000_000) * cacheWriteRate
  );
}

/**
 * Backward-compatible session-total cost used by callers that already have a
 * single SessionUsage rollup (no per-message granularity). Loses tier accuracy
 * for sessions where a single message exceeded 200K tokens, but matches the
 * legacy behavior. Prefer summing calculateMessageCost over deduped messages
 * when per-message data is available.
 */
function calculateUsageCost(usage: SessionUsage): number {
  return calculateMessageCost({
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    cacheCreationTokens: usage.cacheCreationTokens,
    model: usage.model,
  });
}

export interface DailyStats {
  date: string;
  sessions: number;
  cost: number;
}

const STATS_CACHE_KEY = "claudecast-stats-v2";
const STATS_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const TODAY_STATS_LOCALSTORAGE_KEY = "claudecast-today-stats-v1";

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

interface PersistedTodayStats {
  stats: UsageStats;
  timestamp: number;
  date: string;
}

/**
 * Get usage statistics for today.
 * Two-tier cache: in-memory (fast, lost on worker restart) + LocalStorage
 * (persists across Raycast menu-bar cold starts so the 30s background tick
 * doesn't pay full disk cost on every refresh).
 */
export async function getTodayStats(): Promise<UsageStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Tier 1: in-memory cache.
  if (
    todayStatsCache &&
    todayStatsCache.date === todayStr &&
    Date.now() - todayStatsCache.timestamp < TODAY_STATS_CACHE_TTL
  ) {
    return todayStatsCache.stats;
  }

  // Tier 2: LocalStorage. Survives worker restarts.
  try {
    const persisted = await LocalStorage.getItem<string>(
      TODAY_STATS_LOCALSTORAGE_KEY,
    );
    if (persisted) {
      const parsed: PersistedTodayStats = JSON.parse(persisted);
      if (
        parsed.date === todayStr &&
        Date.now() - parsed.timestamp < TODAY_STATS_CACHE_TTL
      ) {
        todayStatsCache = parsed;
        return parsed.stats;
      }
    }
  } catch {
    // ignore parse / storage errors and fall through to recompute
  }

  // Compute fresh.
  const todaySessions = await listAllSessions({ afterDate: today });
  const stats = await calculateStatsWithUsage(todaySessions, today);

  todayStatsCache = { stats, timestamp: Date.now(), date: todayStr };
  try {
    await LocalStorage.setItem(
      TODAY_STATS_LOCALSTORAGE_KEY,
      JSON.stringify(todayStatsCache),
    );
  } catch {
    // ignore storage errors
  }

  return stats;
}

/**
 * Get usage statistics for this week
 */
export async function getWeekStats(): Promise<UsageStats> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const weekSessions = await listAllSessions({ afterDate: weekAgo });
  return calculateStatsWithUsage(weekSessions, weekAgo);
}

/**
 * Get usage statistics for this month
 */
export async function getMonthStats(): Promise<UsageStats> {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  monthAgo.setHours(0, 0, 0, 0);

  const monthSessions = await listAllSessions({ afterDate: monthAgo });
  return calculateStatsWithUsage(monthSessions, monthAgo);
}

/**
 * Get all-time usage statistics (cached for 1 hour).
 * No truncation: bounded streaming plus per-message processing keeps memory low
 * even across thousands of sessions.
 */
export async function getAllTimeStats(): Promise<UsageStats> {
  const cached = await LocalStorage.getItem<string>(STATS_CACHE_KEY);
  if (cached) {
    const cachedStats: CachedStats = JSON.parse(cached);
    if (Date.now() - cachedStats.timestamp < STATS_CACHE_TTL) {
      return cachedStats.stats;
    }
  }

  const allSessions = await listAllSessions();
  const stats = await calculateStatsWithUsage(allSessions);

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
 * Invalidate the stats cache.
 * Call this after creating/deleting sessions to ensure fresh data.
 */
export async function invalidateStatsCache(): Promise<void> {
  await LocalStorage.removeItem(STATS_CACHE_KEY);
  await LocalStorage.removeItem(TODAY_STATS_LOCALSTORAGE_KEY);
  todayStatsCache = null;
}

/**
 * Get daily stats for the last N days.
 * Buckets cost by per-entry timestamp (not file mtime), so a multi-day session
 * gets its cost attributed to each day it was actually used on.
 */
export async function getDailyStats(days: number = 7): Promise<DailyStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const allSessions = await listAllSessions({ afterDate: startDate });

  // Per-day map: dateStr → { unique session ids, summed cost }.
  const dailyMap = new Map<string, { sessions: Set<string>; cost: number }>();

  for (const session of allSessions) {
    const usage = await streamSessionUsage(session.filePath, startDate, {
      bucketByDay: true,
    });
    if (!usage.dailyByDate) continue;
    for (const [dateStr, msgs] of usage.dailyByDate) {
      let entry = dailyMap.get(dateStr);
      if (!entry) {
        entry = { sessions: new Set<string>(), cost: 0 };
        dailyMap.set(dateStr, entry);
      }
      entry.sessions.add(session.id);
      for (const m of msgs) {
        entry.cost += calculateMessageCost(m);
      }
    }
  }

  const dailyStats: DailyStats[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const entry = dailyMap.get(dateStr);
    dailyStats.push({
      date: dateStr,
      sessions: entry?.sessions.size || 0,
      cost: entry?.cost || 0,
    });
  }

  return dailyStats.reverse();
}

/**
 * Stream each session and aggregate tier-aware per-message cost.
 * Does NOT mutate the input session array. Costs are tracked in a local Map
 * and the lightweight TopSessionSummary projection is used for the returned
 * topSessions list.
 *
 * afterDate filters tokens to entries within the time range.
 */
async function calculateStatsWithUsage(
  sessions: SessionMetadata[],
  afterDate?: Date,
): Promise<UsageStats> {
  let totalCostCents = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;
  const sessionsByProject: Record<string, { count: number; cost: number }> = {};
  const projectCostCents: Record<string, number> = {};
  const sessionCosts = new Map<string, number>();

  for (const session of sessions) {
    const usage = await streamSessionUsage(session.filePath, afterDate);

    // Tier-aware: sum per-message costs, not session-total costs.
    let cost = 0;
    for (const m of usage.messages) {
      cost += calculateMessageCost(m);
    }
    sessionCosts.set(session.id, cost);

    const costCents = Math.round(cost * 10000);
    totalCostCents += costCents;

    totalInputTokens += usage.inputTokens;
    totalOutputTokens += usage.outputTokens;
    totalCacheReadTokens += usage.cacheReadTokens;
    totalCacheCreationTokens += usage.cacheCreationTokens;

    if (!sessionsByProject[session.projectName]) {
      sessionsByProject[session.projectName] = { count: 0, cost: 0 };
      projectCostCents[session.projectName] = 0;
    }
    sessionsByProject[session.projectName].count++;
    projectCostCents[session.projectName] += costCents;
  }

  for (const projectName of Object.keys(sessionsByProject)) {
    sessionsByProject[projectName].cost = projectCostCents[projectName] / 10000;
  }

  // Lightweight projection only. Never retain full SessionMetadata refs
  // inside the cached UsageStats (would alias the same memory across calls).
  const topSessions: TopSessionSummary[] = sessions
    .map((s) => ({
      id: s.id,
      projectName: s.projectName,
      firstMessage: s.firstMessage,
      cost: sessionCosts.get(s.id) ?? 0,
    }))
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

export function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return `${count}`;
}

/**
 * Generate ASCII bar chart for daily costs (legacy fallback for any caller
 * that still uses the markdown view)
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

// Re-export for callers that still import the legacy single-cost helper.
export { calculateUsageCost };
