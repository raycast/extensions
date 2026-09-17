import { executeSQL } from "@raycast/utils";
import { basename } from "node:path";
import { discoverStateDb } from "./codex-paths";
import { scanRecentRollouts } from "./rollout-fallback";

export type ThreadMode = "Interactive" | "All" | "Archived";

export interface ThreadRow {
  id: string;
  rollout_path: string;
  created_at: number;
  updated_at: number;
  source: string;
  thread_source: string | null;
  cwd: string;
  title: string;
  first_user_message: string;
  preview: string;
  archived: number;
  git_branch: string | null;
  git_origin_url: string | null;
  model: string | null;
  tokens_used: number;
  displayTitle?: string;
}

export interface ProjectRow {
  cwd: string;
  session_count: number;
  last_used: number;
  git_origin_url: string | null;
}

export interface LoadResult<T> {
  rows: T[];
  degraded: boolean;
  truncated?: boolean;
}

// Text columns are bounded with substr(): first_user_message can hold entire pasted
// documents, and unbounded rows blow Raycast's 100 MB command heap on large histories.
const threadColumns = [
  "id",
  "rollout_path",
  "created_at",
  "updated_at",
  "source",
  "thread_source",
  "cwd",
  "substr(title, 1, 300) AS title",
  "substr(first_user_message, 1, 2000) AS first_user_message",
  "substr(preview, 1, 300) AS preview",
  "archived",
  "git_branch",
  "git_origin_url",
  "model",
  "tokens_used",
].join(", ");

export const interactiveWhere = `archived = 0
  AND COALESCE(thread_source, '') != 'subagent'
  AND COALESCE(source, '') != 'exec'
  AND source NOT LIKE '{%'`;

export function escapeSqlLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

function normalizeLimit(limit: number): number {
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 200;
}

export function threadsQuery(mode: ThreadMode, limit = 5000): string {
  const safeLimit = normalizeLimit(limit);
  const where = mode === "Interactive" ? interactiveWhere : mode === "Archived" ? "archived = 1" : "1 = 1";
  return `SELECT ${threadColumns}
FROM threads
WHERE ${where}
ORDER BY updated_at DESC
LIMIT ${safeLimit}`;
}

export function searchAllThreadsQuery(search: string, mode: ThreadMode, limit = 200): string {
  const safeLimit = normalizeLimit(limit);
  const escaped = escapeSqlLiteral(search.trim());
  const whereMode = mode === "Archived" ? "archived = 1" : mode === "All" ? "1 = 1" : interactiveWhere;
  const like = `%${escaped}%`;
  const terms = ["title", "first_user_message", "preview", "cwd", "git_branch", "id"]
    .map((column) => `${column} LIKE '${like}'`)
    .join(" OR ");
  return `SELECT ${threadColumns}
FROM threads
WHERE ${whereMode}
  AND (${terms})
ORDER BY updated_at DESC
LIMIT ${safeLimit}`;
}

export function projectsQuery(limit = 500): string {
  return `SELECT cwd, COUNT(*) AS session_count, MAX(updated_at) AS last_used,
  MAX(NULLIF(git_origin_url, '')) AS git_origin_url
FROM threads
WHERE cwd IS NOT NULL AND cwd != ''
  AND COALESCE(thread_source, '') != 'subagent'
  AND COALESCE(source, '') != 'exec'
  AND source NOT LIKE '{%'
GROUP BY cwd
ORDER BY last_used DESC
LIMIT ${normalizeLimit(limit)}`;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
}

export function normalizeTimestamp(value: unknown): number {
  const timestamp = number(value);
  return timestamp > 100_000_000_000 ? timestamp : timestamp * 1000;
}

export function threadTitle(row: Pick<ThreadRow, "title" | "first_user_message" | "preview" | "id">): string {
  const candidates = [text(row.title).trim(), text(row.first_user_message).trim(), text(row.preview).trim()];
  const chosenIndex = candidates.findIndex(Boolean);
  if (chosenIndex === -1) return row.id;
  const chosen = candidates[chosenIndex];
  return chosenIndex === 1 ? chosen.slice(0, 80) : chosen;
}

function normalizeThread(row: Partial<ThreadRow>): ThreadRow {
  const normalized = {
    id: text(row.id),
    rollout_path: text(row.rollout_path),
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
    source: text(row.source),
    thread_source: row.thread_source == null ? null : text(row.thread_source),
    cwd: text(row.cwd),
    title: text(row.title),
    first_user_message: text(row.first_user_message),
    preview: text(row.preview),
    archived: number(row.archived),
    git_branch: row.git_branch == null ? null : text(row.git_branch),
    git_origin_url: row.git_origin_url == null ? null : text(row.git_origin_url),
    model: row.model == null ? null : text(row.model),
    tokens_used: number(row.tokens_used),
  } satisfies ThreadRow;
  return { ...normalized, displayTitle: threadTitle(normalized) };
}

export function normalizeProject(row: Partial<ProjectRow>): ProjectRow {
  return {
    cwd: text(row.cwd),
    session_count: number(row.session_count),
    last_used: normalizeTimestamp(row.last_used),
    git_origin_url: row.git_origin_url == null ? null : text(row.git_origin_url),
  };
}

export function projectName(cwd: string): string {
  return basename(cwd) || cwd;
}

export function filterThreadRows(rows: ThreadRow[], search: string): ThreadRow[] {
  const needle = search.trim().toLocaleLowerCase();
  if (!needle) return rows;
  return rows.filter((row) =>
    [row.title, row.first_user_message, row.preview, row.cwd, row.id].some((value) =>
      value.toLocaleLowerCase().includes(needle),
    ),
  );
}

export async function loadThreads(mode: ThreadMode = "Interactive", search = ""): Promise<LoadResult<ThreadRow>> {
  const db = await discoverStateDb();
  if (!db) {
    if (mode === "Archived") return { rows: [], degraded: true };
    return { rows: filterThreadRows(await scanRecentRollouts(), search), degraded: true };
  }

  try {
    const query =
      search.trim() && mode !== "Interactive"
        ? searchAllThreadsQuery(search, mode)
        : threadsQuery(mode, mode === "Interactive" ? 5000 : 200);
    const rows = (await executeSQL<Partial<ThreadRow>>(db, query)).map(normalizeThread);
    return { rows, degraded: false, truncated: mode === "Interactive" && rows.length >= 5000 };
  } catch {
    if (mode === "Archived") return { rows: [], degraded: true };
    return { rows: filterThreadRows(await scanRecentRollouts(), search), degraded: true };
  }
}

export async function loadProjects(): Promise<LoadResult<ProjectRow>> {
  const db = await discoverStateDb();
  if (!db) return { rows: [], degraded: true };
  try {
    const rows = (await executeSQL<Partial<ProjectRow>>(db, projectsQuery())).map(normalizeProject);
    return { rows, degraded: false };
  } catch {
    return { rows: [], degraded: true };
  }
}
