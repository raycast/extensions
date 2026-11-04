import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "./exec";
import { CODEX_DIR } from "./paths";
import { HistoryEntry, Session, SessionTitle } from "./types";

export async function readCodexTitles(sessions: Session[], root = CODEX_DIR, now = Date.now): Promise<SessionTitle[]> {
  const observedAt = now();
  const known = new Set(sessions.map((session) => session.sessionId));
  return (await readCodexDesktopSessions(root))
    .filter((entry) => known.has(entry.sessionId))
    .map((entry) => ({
      agent: "codex",
      sessionId: entry.sessionId,
      title: entry.title,
      observedAt,
      source: "codex-catalog",
    }));
}

/** A renamed conversation retains its original prompt in transcripts; show its current catalog name. */
export function enrichCodexTitles<T extends HistoryEntry>(sessions: T[], catalog: HistoryEntry[]): T[] {
  const names = new Map(catalog.map((entry) => [entry.sessionId, entry.title]));
  return sessions.map((session) => {
    const title = session.agent === "codex" ? names.get(session.sessionId) : undefined;
    return title ? { ...session, title } : session;
  });
}

/** Read names/IDs, not credentials or transcript bodies, from Codex's optional local catalog. */
export async function readCodexDesktopSessions(root = CODEX_DIR): Promise<HistoryEntry[]> {
  let files: string[];
  try {
    files = readdirSync(root)
      .filter((name) => /^state(?:_\d+)?\.sqlite$/.test(name))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  } catch {
    return [];
  }
  for (const file of files) {
    const path = join(root, file);
    const schema = await query(path, "PRAGMA table_info(threads);");
    const columns = new Set(schema?.map((row) => row.name));
    if (!columns.has("id") || (!columns.has("name") && !columns.has("title"))) continue;
    // Detect columns instead of pinning a database version. Older releases have only `title`.
    const col = (name: string, fallback: string) => (columns.has(name) ? `"${name}"` : fallback);
    const name = `COALESCE(NULLIF(${col("name", "NULL")}, ''), ${col("title", "''")}, '')`;
    const rows = await query(
      path,
      `SELECT id, ${name} AS name, ${col("cwd", "''")} AS cwd, ${col("rollout_path", "''")} AS path, ` +
        `${col("created_at_ms", `${col("created_at", "0")} * 1000`)} AS started, ` +
        `${col("updated_at_ms", `${col("updated_at", "0")} * 1000`)} AS updated ` +
        `FROM threads${columns.has("archived") ? " WHERE archived=0" : ""};`,
    );
    if (!rows) continue;
    return rows
      .filter((row) => typeof row.id === "string" && typeof row.name === "string" && row.name.trim())
      .map((row) => ({
        agent: "codex",
        sessionId: String(row.id),
        host: "app",
        title: String(row.name),
        cwd: typeof row.cwd === "string" ? row.cwd : "",
        transcriptPath: typeof row.path === "string" ? row.path : "",
        summary: "",
        startedAt: Number(row.started) || 0,
        updatedAt: Number(row.updated) || 0,
      }));
  }
  // Older/unsupported catalogs may still publish renamed threads through this append-only index.
  const path = join(root, "session_index.jsonl");
  if (!existsSync(path)) return [];
  const names = new Map<string, HistoryEntry>();
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      try {
        const row = JSON.parse(line);
        if (typeof row.id !== "string" || typeof row.thread_name !== "string" || !row.thread_name.trim()) continue;
        names.set(row.id, {
          agent: "codex",
          sessionId: row.id,
          host: "app",
          title: row.thread_name,
          cwd: "",
          summary: "",
          transcriptPath: "",
          startedAt: 0,
          updatedAt: Date.parse(row.updated_at) || 0,
        });
      } catch {
        /* A partially written final line is not a session. */
      }
    }
  } catch {
    /* The catalog is optional. */
  }
  return [...names.values()];
}

async function query(path: string, sql: string): Promise<Record<string, unknown>[] | undefined> {
  const result = await run("/usr/bin/sqlite3", ["-readonly", "-json", "-cmd", ".timeout 1000", path, sql]);
  if (!result.ok) return undefined;
  try {
    const rows = JSON.parse(result.stdout || "[]");
    return Array.isArray(rows) ? rows : undefined;
  } catch {
    return undefined;
  }
}
