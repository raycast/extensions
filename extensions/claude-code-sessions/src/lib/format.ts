import { homedir } from "os";
import { basename } from "path";

/**
 * Relative time as always-compact units — "5m", "3h", "1d", "5d", "3w" — with
 * no special-cased words like "just now"/"Today"/"Yesterday", per explicit
 * user request for UI consistency. Falls back to a short date past ~5 weeks.
 */
export function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.round(diffMs / 1000));
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 1) return "1m";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const diffWeek = Math.round(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type DateBucket =
  "Today" | "Yesterday" | "This week" | "This month" | "Older";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Buckets a date (file mtime) into the section groups used by the list. */
export function dateBucket(date: Date, now: Date = new Date()): DateBucket {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfYesterday = new Date(startOfToday.getTime() - DAY_MS);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * DAY_MS);
  const startOfMonth = new Date(startOfToday.getTime() - 30 * DAY_MS);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  if (date >= startOfWeek) return "This week";
  if (date >= startOfMonth) return "This month";
  return "Older";
}

export const DATE_BUCKET_ORDER: DateBucket[] = [
  "Today",
  "Yesterday",
  "This week",
  "This month",
  "Older",
];

/** Human-readable byte size, e.g. "3.2 MB". */
export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Best-effort prettified project name for the filter dropdown, derived from a
 * real `cwd` value observed in session data (never from the encoded project
 * directory name on disk).
 */
export function prettyProjectName(cwd: string): string {
  const home = homedir();
  const withoutHome = cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd;
  const base = basename(withoutHome);
  return base || withoutHome;
}

/** True if `cwd` lives under `~/conductor/workspaces/`. */
export function isConductorCwd(cwd: string): boolean {
  const conductorRoot = `${homedir()}/conductor/workspaces/`;
  return cwd.startsWith(conductorRoot);
}

const WORKTREE_MARKER = "/.claude/worktrees/";

export interface ProjectRoot {
  /** Stable, comparable key for the project-filter dropdown value. */
  key: string;
  /** Prettified display label, e.g. "my-repo" or "browser-runner". */
  label: string;
}

/**
 * Derives the ROOT project for a session's `cwd`, so a repo's worktrees and
 * a repo's Conductor workspaces all bucket under one dropdown entry instead
 * of each worktree/workspace showing up as its own "project". The key is
 * just the bare repo name in all three recognized cases (not a filesystem
 * path) specifically so a repo checked out under `~/Developer` and *also*
 * worked on via Conductor workspaces — the same repo name in both places —
 * collapses into a single bucket rather than two look-alike entries:
 *
 * - `.../<repo>/.claude/worktrees/<name>/...`   -> root `<repo>`
 * - `~/conductor/workspaces/<repo>/<city>/...`  -> root `<repo>`
 * - `~/Developer/<repo>[/...]`                  -> root `<repo>`
 * - anything else                               -> falls back to `prettyProjectName`
 */
export function deriveProjectRoot(cwd: string): ProjectRoot {
  const worktreeIdx = cwd.indexOf(WORKTREE_MARKER);
  if (worktreeIdx !== -1) {
    const repo = basename(cwd.slice(0, worktreeIdx)) || cwd;
    return { key: repo, label: repo };
  }

  const conductorRoot = `${homedir()}/conductor/workspaces/`;
  if (cwd.startsWith(conductorRoot)) {
    const repo = cwd.slice(conductorRoot.length).split("/")[0];
    if (repo) return { key: repo, label: repo };
  }

  const developerRoot = `${homedir()}/Developer/`;
  if (cwd.startsWith(developerRoot)) {
    const repo = cwd.slice(developerRoot.length).split("/")[0];
    if (repo) return { key: repo, label: repo };
  }

  return { key: cwd, label: prettyProjectName(cwd) };
}

/**
 * The worktree name or Conductor "city" for `cwd`, if any — useful as
 * secondary per-row context once sessions are bucketed by root project.
 */
export function deriveWorktreeOrCityLabel(cwd: string): string | undefined {
  const worktreeIdx = cwd.indexOf(WORKTREE_MARKER);
  if (worktreeIdx !== -1) {
    const name = cwd.slice(worktreeIdx + WORKTREE_MARKER.length).split("/")[0];
    return name || undefined;
  }

  const conductorRoot = `${homedir()}/conductor/workspaces/`;
  if (cwd.startsWith(conductorRoot)) {
    const city = cwd.slice(conductorRoot.length).split("/")[1];
    return city || undefined;
  }

  return undefined;
}

/**
 * Stable hash of `key` into `[0, paletteSize)`, used to pick a deterministic
 * color per project so the same project always gets the same row-icon tint
 * across renders/launches, without hardcoding a mapping. Deliberately
 * doesn't return a `Color` itself — this module has no `@raycast/api`
 * dependency (see `sessions.ts`'s `KeyValueCache` doc for why: it's also
 * imported by the standalone smoke script) — the caller maps the index to
 * whatever palette it likes.
 */
export function stableHashIndex(key: string, paletteSize: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % paletteSize;
}

/** Truncates text to `maxLength` chars, breaking on a word boundary when possible. */
export function truncate(text: string, maxLength: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;
  const cut = collapsed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
