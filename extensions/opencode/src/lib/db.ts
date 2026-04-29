import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";

const DB_PATH = join(homedir(), ".local", "share", "opencode", "opencode.db");

/**
 * Find session IDs currently open in OpenCode TUI instances
 * by parsing process arguments.
 */
export type SessionLiveness = "active" | "open" | "closed";

export interface OpenSession {
  id: string;
  liveness: SessionLiveness;
}

/**
 * Detect which sessions are open in a terminal and whether they're actively working.
 * - "active": open in terminal AND (updated in last 60s OR has in_progress todos)
 * - "open": open in terminal but idle
 * - Sessions not in the result are closed.
 */
function escSql(str: string): string {
  return str.replace(/'/g, "''");
}

let openSessionsCache: { data: OpenSession[]; timestamp: number } | null = null;
const OPEN_SESSIONS_TTL = 5_000;

export function getOpenSessions(): OpenSession[] {
  if (openSessionsCache && Date.now() - openSessionsCache.timestamp < OPEN_SESSIONS_TTL) {
    return openSessionsCache.data;
  }
  // 1. Find session IDs from process list
  const processIds: string[] = [];
  try {
    const output = execSync("ps aux", { encoding: "utf-8" });
    for (const line of output.split("\n")) {
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

  // 2. Check which are recently active (updated in last 60s) or have in_progress todos
  // Uses query() which passes SQL via stdin to avoid shell injection
  const cutoff = Date.now() - 60_000;
  const inClause = processIds.map((id) => `'${escSql(id)}'`).join(",");

  const recentOutput = query(`SELECT id FROM session WHERE id IN (${inClause}) AND time_updated > ${cutoff}`);
  const recentlyUpdated = new Set<string>(recentOutput.trim().split("\n").filter(Boolean));

  const todoOutput = query(
    `SELECT DISTINCT session_id FROM todo WHERE session_id IN (${inClause}) AND status = 'in_progress'`,
  );
  const hasTodos = new Set<string>(todoOutput.trim().split("\n").filter(Boolean));

  const result = processIds.map((id) => ({
    id,
    liveness: (recentlyUpdated.has(id) || hasTodos.has(id) ? "active" : "open") as SessionLiveness,
  }));
  openSessionsCache = { data: result, timestamp: Date.now() };
  return result;
}

export interface DbProject {
  id: string;
  worktree: string;
  name: string;
}

export function getProjects(): DbProject[] {
  const output = query("SELECT id, worktree, name FROM project ORDER BY time_updated DESC");
  const projects: DbProject[] = [];
  for (const line of output.trim().split("\n")) {
    if (!line) continue;
    const [id, worktree, name] = line.split("|");
    projects.push({ id, worktree, name: name || "" });
  }
  return projects;
}

function query(sql: string): string {
  try {
    return execSync(`sqlite3 "${DB_PATH}"`, {
      encoding: "utf-8",
      input: sql,
      timeout: 10_000,
    });
  } catch {
    return "";
  }
}

/**
 * Count sessions per project directly from the shared SQLite database.
 * The API scopes sessions to the current project, but the DB has all of them.
 */
export function getSessionCountsByProject(): Record<string, number> {
  const output = query(
    "SELECT project_id, COUNT(*) FROM session WHERE time_archived IS NULL AND parent_id IS NULL GROUP BY project_id",
  );
  const counts: Record<string, number> = {};
  for (const line of output.trim().split("\n")) {
    if (!line) continue;
    const [projectId, count] = line.split("|");
    counts[projectId] = parseInt(count, 10);
  }
  return counts;
}

export interface DbSession {
  id: string;
  projectId: string;
  title: string;
  directory: string;
  timeCreated: number;
  timeUpdated: number;
}

/**
 * List recent sessions across ALL projects from the SQLite database.
 */
export function getRecentSessions(limit = 100): DbSession[] {
  const output = query(
    `SELECT id, project_id, title, directory, time_created, time_updated FROM session WHERE time_archived IS NULL AND parent_id IS NULL ORDER BY time_updated DESC LIMIT ${limit}`,
  );
  const sessions: DbSession[] = [];
  for (const line of output.trim().split("\n")) {
    if (!line) continue;
    const [id, projectId, title, directory, timeCreated, timeUpdated] = line.split("|");
    sessions.push({
      id,
      projectId,
      title: title || "Untitled",
      directory,
      timeCreated: parseInt(timeCreated, 10),
      timeUpdated: parseInt(timeUpdated, 10),
    });
  }
  return sessions;
}

/**
 * List sessions for a specific project.
 */
export function getProjectSessions(projectId: string, limit = 200): DbSession[] {
  const escaped = projectId.replace(/'/g, "''");
  const output = query(
    `SELECT id, project_id, title, directory, time_created, time_updated FROM session WHERE time_archived IS NULL AND parent_id IS NULL AND project_id = '${escaped}' ORDER BY time_updated DESC LIMIT ${limit}`,
  );
  const sessions: DbSession[] = [];
  for (const line of output.trim().split("\n")) {
    if (!line) continue;
    const [id, pid, title, directory, timeCreated, timeUpdated] = line.split("|");
    sessions.push({
      id,
      projectId: pid,
      title: title || "Untitled",
      directory,
      timeCreated: parseInt(timeCreated, 10),
      timeUpdated: parseInt(timeUpdated, 10),
    });
  }
  return sessions;
}

function parseSessionRows(output: string): DbSession[] {
  const sessions: DbSession[] = [];
  for (const line of output.trim().split("\n")) {
    if (!line) continue;
    const [id, projectId, title, directory, timeCreated, timeUpdated] = line.split("|");
    sessions.push({
      id,
      projectId,
      title: title || "Untitled",
      directory,
      timeCreated: parseInt(timeCreated, 10),
      timeUpdated: parseInt(timeUpdated, 10),
    });
  }
  return sessions;
}

/**
 * Search sessions using multi-word strategy inspired by recover-opencode-conversation skill:
 * 1. Exact phrase in title (best match)
 * 2. Exact phrase in content
 * 3. Individual words in title
 * 4. Individual words in content
 * Results are scored by match count, deduplicated, and sorted by score then recency.
 */
export function searchSessions(keyword: string, limit = 30): DbSession[] {
  const escaped = keyword.replace(/'/g, "''").toLowerCase().trim();
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

  // 1. Exact phrase: title (score 10) + content (score 5) in one query
  const exactSql = [
    `${base} AND lower(title) LIKE '%${escaped}%' ORDER BY time_updated DESC LIMIT ${limit}`,
    `${contentBase} AND (lower(json_extract(p.data, '$.text')) LIKE '%${escaped}%' OR lower(json_extract(p.data, '$.input')) LIKE '%${escaped}%') ORDER BY s.time_updated DESC LIMIT ${limit}`,
  ].join(";\n");
  const exactOutput = query(exactSql);
  // First query results are title matches, second are content matches
  // sqlite3 outputs them sequentially — split by parsing all rows and scoring by title match
  const exactRows = parseSessionRows(exactOutput);
  for (const s of exactRows) {
    const inTitle = s.title.toLowerCase().includes(escaped);
    addResults([s], inTitle ? 10 : 5);
  }

  // 2. Individual words — only if multi-word query, single query with UNION
  if (words.length > 1) {
    const wordTitleQueries = words.map(
      (w) => `${base} AND lower(title) LIKE '%${w}%' ORDER BY time_updated DESC LIMIT ${limit}`,
    );
    const wordContentQueries = words.map(
      (w) =>
        `${contentBase} AND (lower(json_extract(p.data, '$.text')) LIKE '%${w}%' OR lower(json_extract(p.data, '$.input')) LIKE '%${w}%') ORDER BY s.time_updated DESC LIMIT ${limit}`,
    );
    const wordRows = parseSessionRows(query([...wordTitleQueries, ...wordContentQueries].join(";\n")));
    for (const s of wordRows) {
      // Score by how many words match the title (3 each) vs content (1 each)
      const titleLower = s.title.toLowerCase();
      const titleHits = words.filter((w) => titleLower.includes(w)).length;
      addResults([s], titleHits * 3 + 1);
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score || b.session.timeUpdated - a.session.timeUpdated)
    .slice(0, limit)
    .map((e) => e.session);
}
