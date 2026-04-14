import { execFilePromise } from "./utils";

/**
 * Minimum supported WorkspaceDb schema version.
 */
export const MIN_SUPPORTED_DB_VERSION = 30;

/**
 * Query the Gram SQLite database.
 */
export async function queryDb(dbPath: string, query: string): Promise<string> {
  try {
    // Apply `--init /dev/null` to ignore user sqlite configuration
    const result = await execFilePromise("sqlite3", ["--init", "/dev/null", dbPath, query]);

    if (result.stderr) {
      console.error(`Error querying Gram workspace DB: ${result.stderr}`);
      throw new Error(`Error querying Gram workspace DB: ${result.stderr}`);
    }

    return result.stdout.trim();
  } catch (error) {
    console.error(`Error querying Gram workspace DB: ${error}`);
    throw error;
  }
}

/**
 * Detects the Gram workspace database schema version by checking the latest migration step.
 * Returns the version number and whether it's supported by this extension.
 */
export async function getGramWorkspaceDbVersion(dbPath: string): Promise<{ version: number; supported: boolean }> {
  try {
    const result = await queryDb(dbPath, "SELECT MAX(step) FROM migrations WHERE domain = 'WorkspaceDb';");
    const version = parseInt(result, 10);

    const isInvalid = isNaN(version);
    return {
      version: isInvalid ? 0 : version,
      supported: !isInvalid && version >= MIN_SUPPORTED_DB_VERSION,
    };
  } catch (error) {
    // Fallback: If DB is locked (active write), assume it's current to prevent blocking the UI
    if (String(error).includes("Error: in prepare, database is locked")) {
      return { version: MIN_SUPPORTED_DB_VERSION, supported: true };
    }
    return { version: 0, supported: false };
  }
}

/**
 * Get the appropriate SQL query for fetching workspaces based on schema version.
 * This allows for future schema changes while maintaining backward compatibility.
 */
export function getGramWorkspacesQuery(dbVersion: number): string {
  // Future schema changes can add new queries here
  if (dbVersion < MIN_SUPPORTED_DB_VERSION) {
    console.warn(`Unsupported DB version ${dbVersion}, using latest query`);
  }
  return GRAM_WORKSPACES_QUERY;
}

/**
 * SQL query to fetch workspaces from Gram DB (v30+).
 *
 * Schema uses remote_connections table for SSH/WSL/container connections.
 * Paths are stored as newline-separated strings with paths_order for ordering.
 *
 * See docs/gram-db.md for full schema documentation.
 */
export const GRAM_WORKSPACES_QUERY = `SELECT
  CASE
    WHEN remote_connection_id IS NULL THEN 'local'
    ELSE 'remote'
  END AS type,
  workspace_id as id,
  paths,
  paths_order,
  timestamp,
  window_id,
  session_id,
  host,
  user,
  port,
  kind,
  distro
FROM workspaces
LEFT JOIN remote_connections ON workspaces.remote_connection_id = remote_connections.id
ORDER BY timestamp DESC`;
