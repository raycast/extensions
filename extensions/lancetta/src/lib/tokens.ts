import { lancettaExport } from "./lancetta";

/**
 * `Lancetta tokens --json --days N`: Claude Code's tokens per day and per project, counted as
 * Lancetta's Usage pane counts them: input + output + cache creation, without cache reads,
 * which would be 98% of the total and drown the rest, each message once however many
 * transcripts repeat it. The command scans the transcripts when it runs, so today is current.
 *
 * Codex's tokens are not on disk at all: the app asks Codex's account for them.
 */
type TokensDocument = {
  schema: number;
  asOf: number;
  days: { day: string; tokens: number }[];
  projects: { project: string; tokens: number; days: { day: string; tokens: number }[] }[];
};

export type TokenUsage = {
  /** Day (YYYY-MM-DD) -> tokens. */
  byDay: Map<string, number>;
  /** Project -> day -> tokens. */
  byProject: Map<string, Map<string, number>>;
  /** When Lancetta counted, in seconds: today's tokens are counted up to then. */
  asOf: number | null;
};

export const NO_TOKENS: TokenUsage = { byDay: new Map(), byProject: new Map(), asOf: null };

/** The last `days` days (1 to 3650), counted by one run of the command; a cold scan can take a few seconds. */
export async function loadClaudeTokens(days: number): Promise<TokenUsage> {
  const document = await lancettaExport<TokensDocument>(["tokens", "--days", String(days)], 60000);
  return {
    byDay: new Map(document.days.map((d) => [d.day, d.tokens])),
    byProject: new Map(document.projects.map((p) => [p.project, new Map(p.days.map((d) => [d.day, d.tokens]))])),
    asOf: document.asOf,
  };
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
