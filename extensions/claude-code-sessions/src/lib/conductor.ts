import { execFile } from "child_process";
import { promisify } from "util";
import { homedir } from "os";

// Deliberately no `@raycast/api` import anywhere in this file (see
// src/lib/sessions.ts's `KeyValueCache` doc for why): it only resolves to a
// real module inside the Raycast app, and this module is also exercised by
// the standalone smoke script. `open(1)` handles custom URL schemes (like
// `conductor://...`) exactly the same way Raycast's own `open()` helper
// would, so we just shell out to it directly instead.
const execFileAsync = promisify(execFile);

const CONDUCTOR_DB_PATH = `${homedir()}/Library/Application Support/com.conductor.app/conductor.db`;

interface ConductorWorkspaceRow {
  id: string;
  workspace_path: string | null;
  state: string | null;
}

export interface ConductorWorkspaceInfo {
  id: string;
  /** Raw `state` column value — seen values on a real DB: "archived", "ready". */
  state: string | null;
}

let workspaceCache: Map<string, ConductorWorkspaceInfo> | null = null;
let workspaceCacheExpiresAt = 0;
const WORKSPACE_CACHE_TTL_MS = 60_000;

/**
 * Reads the Conductor `workspaces` table (read-only) and returns a map of
 * workspace_path -> {id, state}. The `workspace_path` column holds paths
 * like `~/conductor/workspaces/<repo>/<name>`, `id` is the
 * workspace UUID used in the `conductor://workspace/<id>` deep link, and
 * `state` is "archived" for workspaces the user archived in Conductor
 * (confirmed by querying `SELECT DISTINCT state FROM workspaces` on a real
 * profile: only "archived" and "ready" appear).
 */
async function loadConductorWorkspaces(): Promise<
  Map<string, ConductorWorkspaceInfo>
> {
  const now = Date.now();
  if (workspaceCache && now < workspaceCacheExpiresAt) {
    return workspaceCache;
  }

  const map = new Map<string, ConductorWorkspaceInfo>();
  try {
    const { stdout } = await execFileAsync(
      "sqlite3",
      [
        "-readonly",
        "-json",
        CONDUCTOR_DB_PATH,
        "SELECT id, workspace_path, state FROM workspaces WHERE workspace_path IS NOT NULL",
      ],
      { maxBuffer: 32 * 1024 * 1024 },
    );
    const rows =
      stdout.trim().length > 0
        ? (JSON.parse(stdout) as ConductorWorkspaceRow[])
        : [];
    for (const row of rows) {
      if (row.workspace_path)
        map.set(row.workspace_path, { id: row.id, state: row.state });
    }
  } catch {
    // Conductor may not be installed, the DB may be locked, or sqlite3 may be
    // unavailable — degrade gracefully to "no conductor workspace found".
  }

  workspaceCache = map;
  workspaceCacheExpiresAt = now + WORKSPACE_CACHE_TTL_MS;
  return map;
}

/** Finds the Conductor workspace whose `workspace_path` matches `cwd`, if any. */
export async function findConductorWorkspaceInfo(
  cwd: string,
): Promise<ConductorWorkspaceInfo | undefined> {
  const map = await loadConductorWorkspaces();
  return map.get(cwd);
}

/**
 * All Conductor workspaces keyed by `workspace_path`, as a plain object (not
 * a `Map`) so it's safe for `useCachedPromise`'s own persistence layer. Used
 * so the UI can synchronously check archived status for every session's
 * `cwd` after a single load, instead of one DB query per row.
 */
export async function loadConductorWorkspaceMap(): Promise<
  Record<string, ConductorWorkspaceInfo>
> {
  const map = await loadConductorWorkspaces();
  return Object.fromEntries(map);
}

/** Finds the Conductor workspace id whose `workspace_path` matches `cwd`, if any. */
export async function findConductorWorkspaceId(
  cwd: string,
): Promise<string | undefined> {
  const info = await findConductorWorkspaceInfo(cwd);
  return info?.id;
}

interface ConductorSessionRow {
  claude_session_id: string | null;
  title: string | null;
}

let sessionTitleCache: Map<string, string> | null = null;
let sessionTitleCacheExpiresAt = 0;

/**
 * Conductor's `sessions` table (schema: `id, status, claude_session_id,
 * title TEXT DEFAULT 'Untitled', workspace_id, ...`) has one row per
 * Conductor-side session, and `claude_session_id` is the same uuid as our
 * own `.jsonl` filenames — the same join key we already use for Claude
 * Desktop's `local_*.json` records. Returns a map of claude_session_id ->
 * title, skipping rows with no title or the literal schema default
 * "Untitled" (that's a placeholder, not a real title — better to fall
 * through to our other title sources for those).
 *
 * Note: a workspace's *branch name* can drift away from its session's own
 * title over time (e.g. a workspace gets renamed/repurposed for a new task
 * while an old session inside it keeps its original title) — confirmed on a
 * real profile where a workspace's branch was
 * `luiseugenio/free-text-field-not-filled` (what Conductor's sidebar shows,
 * humanized) but its `active_session_id`'s own `sessions.title` was the
 * unrelated, older "Revisar POC sets". We use the *session's own* title
 * here (matching per-conversation, like every other title source in this
 * extension), not the workspace/branch name, since that's the correct join
 * for "this specific session's title" even though it can occasionally read
 * as stale relative to what Conductor's UI currently labels the workspace.
 */
async function loadConductorSessionTitles(): Promise<Map<string, string>> {
  const now = Date.now();
  if (sessionTitleCache && now < sessionTitleCacheExpiresAt) {
    return sessionTitleCache;
  }

  const map = new Map<string, string>();
  try {
    const { stdout } = await execFileAsync(
      "sqlite3",
      [
        "-readonly",
        "-json",
        CONDUCTOR_DB_PATH,
        "SELECT claude_session_id, title FROM sessions WHERE claude_session_id IS NOT NULL AND title IS NOT NULL AND title != 'Untitled'",
      ],
      { maxBuffer: 32 * 1024 * 1024 },
    );
    const rows =
      stdout.trim().length > 0
        ? (JSON.parse(stdout) as ConductorSessionRow[])
        : [];
    for (const row of rows) {
      if (row.claude_session_id && row.title)
        map.set(row.claude_session_id, row.title);
    }
  } catch {
    // Same graceful degradation as loadConductorWorkspaces().
  }

  sessionTitleCache = map;
  sessionTitleCacheExpiresAt = now + WORKSPACE_CACHE_TTL_MS;
  return map;
}

/**
 * All Conductor session titles keyed by `claude_session_id`, as a plain
 * object (see `loadConductorWorkspaceMap`'s doc for why not a `Map`).
 */
export async function loadConductorSessionTitleMap(): Promise<
  Record<string, string>
> {
  const map = await loadConductorSessionTitles();
  return Object.fromEntries(map);
}

/**
 * Opens a Conductor workspace by id. Tries the `conductor://workspace/<id>`
 * deep link first; if that fails, falls back to just launching the Conductor
 * app with `open -a Conductor`.
 */
export async function openConductorWorkspace(
  workspaceId: string,
): Promise<void> {
  try {
    await execFileAsync("open", [`conductor://workspace/${workspaceId}`]);
  } catch {
    await execFileAsync("open", ["-a", "Conductor"]);
  }
}

/**
 * Looks up the Conductor workspace for `cwd` and opens it; if no matching
 * workspace is found in the DB, just launches the Conductor app.
 */
export async function openInConductorForCwd(cwd: string): Promise<void> {
  const workspaceId = await findConductorWorkspaceId(cwd);
  if (workspaceId) {
    await openConductorWorkspace(workspaceId);
  } else {
    await execFileAsync("open", ["-a", "Conductor"]);
  }
}
