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
  name?: string | null;
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
function threadColumns(hasThreadName: boolean): string {
  return [
    "id",
    "rollout_path",
    "created_at",
    "updated_at",
    "source",
    "thread_source",
    "cwd",
    hasThreadName ? "substr(name, 1, 300) AS name" : "NULL AS name",
    "substr(title, 1, 300) AS title",
    "substr(first_user_message, 1, 2000) AS first_user_message",
    "substr(preview, 1, 300) AS preview",
    "archived",
    "git_branch",
    "git_origin_url",
    "model",
    "tokens_used",
  ].join(", ");
}

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

function modeWhere(mode: ThreadMode): string {
  return mode === "Interactive" ? interactiveWhere : mode === "Archived" ? "archived = 1" : "1 = 1";
}

function projectWhere(projectPath?: string): string {
  return projectPath === undefined ? "" : `\n  AND cwd = '${escapeSqlLiteral(projectPath)}'`;
}

export function threadsQuery(mode: ThreadMode, limit = 5000, hasThreadName = true, projectPath?: string): string {
  const safeLimit = normalizeLimit(limit);
  return `SELECT ${threadColumns(hasThreadName)}
FROM threads
WHERE ${modeWhere(mode)}${projectWhere(projectPath)}
ORDER BY updated_at DESC
LIMIT ${safeLimit}`;
}

export function searchAllThreadsQuery(
  search: string,
  mode: ThreadMode,
  limit = 200,
  hasThreadName = true,
  projectPath?: string,
): string {
  const safeLimit = normalizeLimit(limit);
  const escaped = escapeSqlLiteral(search.trim());
  const like = `%${escaped}%`;
  const columns = ["title", "first_user_message", "preview", "cwd", "git_branch", "id"];
  if (hasThreadName) columns.unshift("name");
  const terms = columns.map((column) => `${column} LIKE '${like}'`).join(" OR ");
  return `SELECT ${threadColumns(hasThreadName)}
FROM threads
WHERE ${modeWhere(mode)}${projectWhere(projectPath)}
  AND (${terms})
ORDER BY updated_at DESC
LIMIT ${safeLimit}`;
}

export function projectsQuery(limit = 500, mode?: ThreadMode): string {
  const where =
    mode === undefined
      ? `COALESCE(thread_source, '') != 'subagent'
  AND COALESCE(source, '') != 'exec'
  AND source NOT LIKE '{%'`
      : modeWhere(mode);
  return `SELECT cwd, COUNT(*) AS session_count, MAX(updated_at) AS last_used,
  MAX(NULLIF(git_origin_url, '')) AS git_origin_url
FROM threads
WHERE cwd IS NOT NULL AND cwd != ''
  AND ${where}
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

export function threadTitle(row: Pick<ThreadRow, "name" | "title" | "first_user_message" | "preview" | "id">): string {
  // Current Codex stores the display name separately; title can still contain the original prompt.
  const candidates = [
    text(row.name).trim(),
    text(row.title).trim(),
    text(row.first_user_message).trim(),
    text(row.preview).trim(),
  ];
  const chosenIndex = candidates.findIndex(Boolean);
  if (chosenIndex === -1) return row.id;
  const chosen = candidates[chosenIndex];
  return chosenIndex === 2 ? chosen.slice(0, 80) : chosen;
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
    name: row.name == null ? null : text(row.name),
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
    [row.name || "", row.title, row.first_user_message, row.preview, row.cwd, row.id].some((value) =>
      value.toLocaleLowerCase().includes(needle),
    ),
  );
}

async function loadRolloutThreads(
  mode: ThreadMode,
  search: string,
  projectPath?: string,
): Promise<LoadResult<ThreadRow>> {
  if (mode === "Archived") return { rows: [], degraded: true };
  const rows = (await scanRecentRollouts()).filter((row) => projectPath === undefined || row.cwd === projectPath);
  return { rows: filterThreadRows(rows, search), degraded: true };
}

export async function loadThreads(
  mode: ThreadMode = "Interactive",
  search = "",
  projectPath?: string,
): Promise<LoadResult<ThreadRow>> {
  const db = await discoverStateDb();
  if (!db) return loadRolloutThreads(mode, search, projectPath);

  try {
    const limit = mode === "Interactive" ? 5000 : 200;
    const query =
      search.trim() && mode !== "Interactive"
        ? searchAllThreadsQuery(search, mode, 200, db.hasThreadName, projectPath)
        : threadsQuery(mode, limit, db.hasThreadName, projectPath);
    const rows = (await executeSQL<Partial<ThreadRow>>(db.path, query)).map(normalizeThread);
    return { rows, degraded: false, truncated: rows.length >= limit };
  } catch {
    return loadRolloutThreads(mode, search, projectPath);
  }
}

export async function loadProjects(mode?: ThreadMode): Promise<LoadResult<ProjectRow>> {
  const db = await discoverStateDb();
  if (!db) return { rows: [], degraded: true };
  try {
    const rows = (await executeSQL<Partial<ProjectRow>>(db.path, projectsQuery(500, mode))).map(normalizeProject);
    return { rows, degraded: false, truncated: rows.length >= 500 };
  } catch {
    return { rows: [], degraded: true };
  }
}
