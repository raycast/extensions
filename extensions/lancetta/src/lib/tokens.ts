import { homedir } from "os";
import { join } from "path";
import { readSupportFile, supportFile } from "./snapshot";

/**
 * Claude Code's tokens per day, from the cache Lancetta keeps of its transcript scan
 * (`claude-usage-cache.json`, `ClaudeUsage`): transcript path -> { size, modified,
 * records: { message id -> { d: day, t: tokens } } }. A day's tokens are input + output +
 * cache creation, without cache reads, which would be 98% of the total and drown the rest.
 *
 * The same message id appears in more than one file (a resumed session, a subagent's
 * transcript), so records are merged by id across files, as the app does: a per-file count
 * left a day 20% high. Internal to the app, and only a cache: it lags until Lancetta rescans.
 *
 * Codex's tokens are not on disk at all: the app asks Codex's account for them.
 */
const CACHE_PATH = supportFile("claude-usage-cache.json");

type CacheEntry = { size?: number; modified?: number; records?: Record<string, { d?: string; t?: number }> };

export type TokenUsage = {
  /** Day (YYYY-MM-DD) -> tokens. */
  byDay: Map<string, number>;
  /** Project -> day -> tokens. */
  byProject: Map<string, Map<string, number>>;
  /** When Lancetta last wrote its scan, in seconds; null before it has made one. Today's tokens are counted up to then. */
  asOf: number | null;
};

export const NO_TOKENS: TokenUsage = { byDay: new Map(), byProject: new Map(), asOf: null };

/** What brings the count up to date: the app rescans when its Usage view loads. */
export const RESCAN_HINT = "Open Lancetta's Usage view to rescan.";

/** `~/.claude/projects/-Users-me-Lavoro-GitHub-app/…` -> `Lavoro-GitHub-app`: Claude Code's own folder name, home dropped. */
function projectOf(transcript: string): string {
  const projects = join(homedir(), ".claude", "projects") + "/";
  const folder = transcript.startsWith(projects) ? transcript.slice(projects.length).split("/")[0] : transcript;
  const home = homedir().replace(/[/.]/g, "-") + "-";
  return folder.startsWith(home) ? folder.slice(home.length) || "~" : folder;
}

export async function loadClaudeTokens(): Promise<TokenUsage> {
  const file = await readSupportFile(CACHE_PATH);
  if (!file) return NO_TOKENS;
  const cache = JSON.parse(file.text) as Record<string, CacheEntry>;
  const seen = new Set<string>();
  const byDay = new Map<string, number>();
  const byProject = new Map<string, Map<string, number>>();
  for (const [transcript, entry] of Object.entries(cache)) {
    const project = projectOf(transcript);
    for (const [id, record] of Object.entries(entry?.records ?? {})) {
      if (seen.has(id) || !record?.d || typeof record.t !== "number") continue;
      seen.add(id);
      byDay.set(record.d, (byDay.get(record.d) ?? 0) + record.t);
      const days = byProject.get(project) ?? new Map<string, number>();
      days.set(record.d, (days.get(record.d) ?? 0) + record.t);
      byProject.set(project, days);
    }
  }
  return { byDay, byProject, asOf: Math.floor(file.modified / 1000) };
}

/** The last `count` days up to today, oldest first, as YYYY-MM-DD in local time. */
export function lastDays(count: number, today = new Date()): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

/** A period's tokens, for the command and the AI tool alike: each day's, the total, and the projects that used any, most first. */
export function usageForDays(usage: TokenUsage, days: string[]) {
  const perDay = days.map((day) => ({ day, tokens: usage.byDay.get(day) ?? 0 }));
  const projects = [...usage.byProject.entries()]
    .map(([project, byDay]) => ({ project, byDay, tokens: days.reduce((sum, day) => sum + (byDay.get(day) ?? 0), 0) }))
    .filter((p) => p.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens);
  return { perDay, total: perDay.reduce((sum, d) => sum + d.tokens, 0), projects };
}

/** A YYYY-MM-DD day as a local date, at noon so no time zone moves it to the day before. */
export const dayDate = (day: string) => new Date(`${day}T12:00:00`);

/** `12.4M`, `830K`, `950`. */
export function formatTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}
