import { getPreferenceValues } from "@raycast/api";
import { executeSQL } from "@raycast/utils";
import { exec, execSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";

import { Message, Part, Project, Session, TranscriptEntry } from "../types";

// --- Liveness types ---

export type SessionLiveness = "active" | "open";

export interface OpenSession {
  id: string;
  liveness: SessionLiveness;
}

export function getDbPath(): string {
  const prefs = getPreferenceValues<ExtensionPreferences>();

  if (prefs.databasePath) {
    return prefs.databasePath.replace(/^~/, homedir());
  }

  return join(homedir(), ".local", "share", "opencode", "opencode.db");
}

export async function checkDatabase(): Promise<string | null> {
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    return "No OpenCode database found. Run opencode (v1.2.0+) at least once to create the database.";
  }

  try {
    const rows = await executeSQL<{ name: string }>(
      dbPath,
      "SELECT name FROM sqlite_master WHERE type='table' AND name='session'",
    );

    if (rows.length === 0) {
      return "OpenCode database exists but is missing expected tables. Try running opencode to complete the migration.";
    }

    return null;
  } catch (error) {
    if (error instanceof Error) {
      return `Could not open OpenCode database: ${error.message}`;
    }

    return "Could not open OpenCode database.";
  }
}

interface ProjectRow {
  id: string;
  worktree: string;
  vcs: string | null;
  name: string | null;
  time_created: number;
  time_updated: number;
  sandboxes: string;
}

interface SessionRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  slug: string;
  directory: string;
  title: string;
  version: string;
  share_url: string | null;
  summary_additions: number | null;
  summary_deletions: number | null;
  summary_files: number | null;
  time_created: number;
  time_updated: number;
  time_compacting: number | null;
  time_archived: number | null;
}

interface MessageRow {
  id: string;
  session_id: string;
  data: string;
}

interface PartRow {
  id: string;
  message_id: string;
  session_id: string;
  data: string;
}

interface TranscriptRow {
  message_id: string;
  message_data: string;
  part_id: string | null;
  part_message_id: string | null;
  part_session_id: string | null;
  part_data: string | null;
}

function toProject(row: ProjectRow): Project {
  let sandboxes: unknown[] = [];

  try {
    sandboxes = JSON.parse(row.sandboxes);
  } catch {
    // ignore malformed JSON
  }

  return {
    id: row.id,
    worktree: row.worktree,
    vcs: row.vcs,
    name: row.name,
    sandboxes,
    time: {
      created: row.time_created,
      updated: row.time_updated,
    },
  };
}

function toSession(row: SessionRow): Session {
  const session: Session = {
    id: row.id,
    slug: row.slug,
    version: row.version,
    projectID: row.project_id,
    directory: row.directory,
    parentID: row.parent_id ?? undefined,
    title: row.title,
    time: {
      created: row.time_created,
      updated: row.time_updated,
      compacting: row.time_compacting ?? undefined,
      archived: row.time_archived ?? undefined,
    },
  };

  if (row.summary_files != null) {
    session.summary = {
      additions: row.summary_additions ?? 0,
      deletions: row.summary_deletions ?? 0,
      files: row.summary_files,
    };
  }

  if (row.share_url) {
    session.share = { url: row.share_url };
  }

  return session;
}

function toMessage(id: string, sessionID: string, dataJson: string): Message {
  const data = JSON.parse(dataJson) as Record<string, unknown>;

  return {
    id,
    sessionID,
    role: data.role as "user" | "assistant",
    time: data.time as { created: number; completed?: number },
    parentID: data.parentID as string | undefined,
    modelID: data.modelID as string | undefined,
    providerID: data.providerID as string | undefined,
    agent: data.agent as string | undefined,
    mode: data.mode as string | undefined,
    cost: data.cost as number | undefined,
    tokens: data.tokens as Message["tokens"] | undefined,
    finish: data.finish as string | undefined,
  };
}

function toPart(id: string, messageID: string, sessionID: string, dataJson: string): Part {
  const data = JSON.parse(dataJson) as Record<string, unknown>;

  return {
    id,
    messageID,
    sessionID,
    type: data.type as string,
    text: data.text as string | undefined,
    tool: data.tool as string | undefined,
    state: data.state as Part["state"] | undefined,
  };
}

export async function loadProjects(): Promise<Project[]> {
  const rows = await executeSQL<ProjectRow>(
    getDbPath(),
    "SELECT id, worktree, vcs, name, time_created, time_updated, sandboxes FROM project",
  );

  return rows.map(toProject);
}

export async function loadSessions(): Promise<Session[]> {
  const rows = await executeSQL<SessionRow>(
    getDbPath(),
    `SELECT id, project_id, parent_id, slug, directory, title, version,
            share_url, summary_additions, summary_deletions, summary_files,
            time_created, time_updated, time_compacting, time_archived
     FROM session
     WHERE parent_id IS NULL
     ORDER BY time_updated DESC`,
  );

  return rows.map(toSession);
}

export async function loadMessages(sessionID: string): Promise<Message[]> {
  const rows = await executeSQL<MessageRow>(
    getDbPath(),
    `SELECT id, session_id, data FROM message WHERE session_id = '${escapeSql(sessionID)}' ORDER BY id ASC`,
  );

  return rows.map((row) => toMessage(row.id, row.session_id, row.data));
}

export async function loadParts(messageID: string): Promise<Part[]> {
  const rows = await executeSQL<PartRow>(
    getDbPath(),
    `SELECT id, message_id, session_id, data FROM part WHERE message_id = '${escapeSql(messageID)}' ORDER BY id ASC`,
  );

  return rows.map((row) => toPart(row.id, row.message_id, row.session_id, row.data));
}

export async function loadTranscript(sessionID: string): Promise<TranscriptEntry[]> {
  const sid = escapeSql(sessionID);
  const rows = await executeSQL<TranscriptRow>(
    getDbPath(),
    `SELECT m.id AS message_id, m.data AS message_data,
            p.id AS part_id, p.message_id AS part_message_id,
            p.session_id AS part_session_id, p.data AS part_data
     FROM message m
     LEFT JOIN part p ON p.message_id = m.id
     WHERE m.session_id = '${sid}'
     ORDER BY m.id ASC, p.id ASC`,
  );

  // Group rows by message
  const entriesMap = new Map<string, TranscriptEntry>();

  for (const row of rows) {
    let entry = entriesMap.get(row.message_id);

    if (!entry) {
      entry = {
        message: toMessage(row.message_id, sessionID, row.message_data),
        parts: [],
      };
      entriesMap.set(row.message_id, entry);
    }

    if (row.part_id && row.part_data && row.part_message_id && row.part_session_id) {
      const part = toPart(row.part_id, row.part_message_id, row.part_session_id, row.part_data);

      if ((part.type === "text" && part.text) || part.type === "tool") {
        entry.parts.push(part);
      }
    }
  }

  // Only include entries that have relevant parts
  return Array.from(entriesMap.values()).filter((entry) => entry.parts.length > 0);
}

function runSql(query: string): void {
  const dbPath = getDbPath();

  execSync(`sqlite3 "${dbPath}"`, {
    input: query,
    timeout: 10000,
  });
}

export async function deleteSession(session: Session): Promise<void> {
  const sid = escapeSql(session.id);

  runSql(
    `WITH RECURSIVE descendants(id) AS (` +
      `SELECT id FROM session WHERE id = '${sid}' ` +
      `UNION ALL ` +
      `SELECT s.id FROM session s JOIN descendants d ON s.parent_id = d.id` +
      `) ` +
      `DELETE FROM session WHERE id IN (SELECT id FROM descendants);`,
  );
}

export async function deleteAllProjectSessions(projectID: string): Promise<void> {
  const pid = escapeSql(projectID);

  runSql(`DELETE FROM session WHERE project_id = '${pid}'; DELETE FROM project WHERE id = '${pid}';`);
}

function escLike(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function querySessionRows(sql: string): Promise<Session[]> {
  const rows = await executeSQL<SessionRow>(getDbPath(), sql);
  return rows.map(toSession);
}

/**
 * Multi-word scored search across session titles and message content.
 */
export async function searchSessions(keyword: string, limit = 30): Promise<Session[]> {
  const escaped = escLike(keyword.toLowerCase().trim());
  if (!escaped) return [];

  const words = escaped.split(/\s+/).filter((w) => w.length >= 2);
  const base =
    "SELECT id, project_id, parent_id, slug, directory, title, version, share_url, summary_additions, summary_deletions, summary_files, time_created, time_updated, time_compacting, time_archived FROM session WHERE time_archived IS NULL AND parent_id IS NULL";
  const contentBase =
    "SELECT DISTINCT s.id, s.project_id, s.parent_id, s.slug, s.directory, s.title, s.version, s.share_url, s.summary_additions, s.summary_deletions, s.summary_files, s.time_created, s.time_updated, s.time_compacting, s.time_archived FROM part p JOIN message m ON p.message_id = m.id JOIN session s ON m.session_id = s.id WHERE s.time_archived IS NULL AND s.parent_id IS NULL";

  const scores = new Map<string, { session: Session; score: number }>();

  function addResults(sessions: Session[], score: number) {
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
    .sort((a, b) => b.score - a.score || b.session.time.updated - a.session.time.updated)
    .slice(0, limit)
    .map((e) => e.session);
}

const execAsync = promisify(exec);

let openSessionsCache: { data: OpenSession[]; timestamp: number } | null = null;
const OPEN_SESSIONS_TTL = 5_000;

/**
 * Detect running opencode processes and determine their liveness.
 */
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
  const inClause = processIds.map((id) => `'${escapeSql(id)}'`).join(",");

  const [recentRows, todoRows] = await Promise.all([
    executeSQL<{ id: string }>(
      getDbPath(),
      `SELECT id FROM session WHERE id IN (${inClause}) AND time_updated > ${cutoff}`,
    ).catch(() => [] as { id: string }[]),
    executeSQL<{ session_id: string }>(
      getDbPath(),
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

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}
