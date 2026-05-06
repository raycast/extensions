import { exec } from "child_process";
import { promisify } from "util";
import { executeSQL } from "@raycast/utils";
import { homedir } from "os";
import { join } from "path";

export const DB_PATH = join(homedir(), ".local", "share", "opencode", "opencode.db");

// --- Types ---

export type SessionLiveness = "active" | "open" | "closed";

export interface OpenSession {
  id: string;
  liveness: SessionLiveness;
}

export interface DbProject {
  id: string;
  worktree: string;
  name: string;
}

export interface DbSession {
  id: string;
  projectId: string;
  title: string;
  directory: string;
  timeCreated: number;
  timeUpdated: number;
}

interface SessionRow {
  id: string;
  project_id: string;
  title: string;
  directory: string;
  time_created: number;
  time_updated: number;
}

function rowToSession(row: SessionRow): DbSession {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title || "Untitled",
    directory: row.directory,
    timeCreated: row.time_created,
    timeUpdated: row.time_updated,
  };
}

function escLike(str: string): string {
  return str.replace(/'/g, "''").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// --- Queries (async, using executeSQL) ---

export async function getSessionCountsByProject(): Promise<Record<string, number>> {
  const rows = await executeSQL<{ project_id: string; cnt: number }>(
    DB_PATH,
    "SELECT project_id, COUNT(*) as cnt FROM session WHERE time_archived IS NULL AND parent_id IS NULL GROUP BY project_id",
  );
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.project_id] = row.cnt;
  }
  return counts;
}

export async function getRecentSessions(limit = 100): Promise<DbSession[]> {
  const rows = await executeSQL<SessionRow>(
    DB_PATH,
    `SELECT id, project_id, title, directory, time_created, time_updated FROM session WHERE time_archived IS NULL AND parent_id IS NULL ORDER BY time_updated DESC LIMIT ${limit}`,
  );
  return rows.map(rowToSession);
}

export async function getProjectSessions(projectId: string, limit = 200): Promise<DbSession[]> {
  const escaped = projectId.replace(/'/g, "''");
  const rows = await executeSQL<SessionRow>(
    DB_PATH,
    `SELECT id, project_id, title, directory, time_created, time_updated FROM session WHERE time_archived IS NULL AND parent_id IS NULL AND project_id = '${escaped}' ORDER BY time_updated DESC LIMIT ${limit}`,
  );
  return rows.map(rowToSession);
}

async function querySessionRows(sql: string): Promise<DbSession[]> {
  const rows = await executeSQL<SessionRow>(DB_PATH, sql);
  return rows.map(rowToSession);
}

/**
 * Search sessions using multi-word strategy:
 * 1. Exact phrase in title (score 10)
 * 2. Exact phrase in content (score 5)
 * 3. Individual words in title (score 3 each)
 * 4. Individual words in content (score 1 each)
 */
export async function searchSessions(keyword: string, limit = 30): Promise<DbSession[]> {
  const escaped = escLike(keyword.toLowerCase().trim());
  if (!escaped) return [];

  const words = escaped.split(/\s+/).filter((w) => w.length >= 2);
  const base =
    "SELECT id, project_id, title, directory, time_created, time_updated FROM session WHERE time_archived IS NULL AND parent_id IS NULL";
  const contentBase =
    "SELECT DISTINCT s.id, s.project_id, s.title, s.directory, s.time_created, s.time_updated FROM part p JOIN message m ON p.message_id = m.id JOIN session s ON m.session_id = s.id WHERE s.time_archived IS NULL AND s.parent_id IS NULL";

  const scores = new Map<string, { session: DbSession; score: number }>();

  function addResults(sessions: DbSession[], score: number) {
    for (const s of sessions) {
      const existing = scores.get(s.id);
      if (existing) {
        existing.score += score;
      } else {
        scores.set(s.id, { session: s, score });
      }
    }
  }

  // 1. Exact phrase in title (score: 10)
  addResults(
    await querySessionRows(
      `${base} AND lower(title) LIKE '%${escaped}%' ESCAPE '\\' ORDER BY time_updated DESC LIMIT ${limit}`,
    ),
    10,
  );

  // 2. Exact phrase in content (score: 5)
  addResults(
    await querySessionRows(
      `${contentBase} AND (lower(json_extract(p.data, '$.text')) LIKE '%${escaped}%' ESCAPE '\\' OR lower(json_extract(p.data, '$.input')) LIKE '%${escaped}%' ESCAPE '\\') ORDER BY s.time_updated DESC LIMIT ${limit}`,
    ),
    5,
  );

  // 3. Individual words — only if multi-word query
  if (words.length > 1) {
    for (const word of words) {
      addResults(
        await querySessionRows(
          `${base} AND lower(title) LIKE '%${word}%' ESCAPE '\\' ORDER BY time_updated DESC LIMIT ${limit}`,
        ),
        3,
      );
      addResults(
        await querySessionRows(
          `${contentBase} AND (lower(json_extract(p.data, '$.text')) LIKE '%${word}%' ESCAPE '\\' OR lower(json_extract(p.data, '$.input')) LIKE '%${word}%' ESCAPE '\\') ORDER BY s.time_updated DESC LIMIT ${limit}`,
        ),
        1,
      );
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score || b.session.timeUpdated - a.session.timeUpdated)
    .slice(0, limit)
    .map((e) => e.session);
}

// --- Open sessions (sync, needs ps aux) ---

const execAsync = promisify(exec);

let openSessionsCache: { data: OpenSession[]; timestamp: number } | null = null;
const OPEN_SESSIONS_TTL = 5_000;

export async function getOpenSessions(): Promise<OpenSession[]> {
  if (openSessionsCache && Date.now() - openSessionsCache.timestamp < OPEN_SESSIONS_TTL) {
    return openSessionsCache.data;
  }

  const processIds: string[] = [];
  try {
    const { stdout } = await execAsync("ps aux");
    for (const line of stdout.split("\n")) {
      if (!line.includes("opencode")) continue;
      const match = line.match(/(?:-s|--session)[=\s]+(\S+)/);
      if (match && !processIds.includes(match[1])) {
        processIds.push(match[1]);
      }
    }
  } catch {
    return [];
  }

  if (processIds.length === 0) return [];

  const cutoff = Date.now() - 60_000;
  const escSql = (s: string) => s.replace(/'/g, "''");
  const inClause = processIds.map((id) => `'${escSql(id)}'`).join(",");

  const [recentRows, todoRows] = await Promise.all([
    executeSQL<{ id: string }>(
      DB_PATH,
      `SELECT id FROM session WHERE id IN (${inClause}) AND time_updated > ${cutoff}`,
    ).catch(() => [] as { id: string }[]),
    executeSQL<{ session_id: string }>(
      DB_PATH,
      `SELECT DISTINCT session_id FROM todo WHERE session_id IN (${inClause}) AND status = 'in_progress'`,
    ).catch(() => [] as { session_id: string }[]),
  ]);

  const recentlyUpdated = new Set(recentRows.map((r) => r.id));
  const hasTodos = new Set(todoRows.map((r) => r.session_id));

  const result = processIds.map((id) => ({
    id,
    liveness: (recentlyUpdated.has(id) || hasTodos.has(id) ? "active" : "open") as SessionLiveness,
  }));
  openSessionsCache = { data: result, timestamp: Date.now() };
  return result;
}
