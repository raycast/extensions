import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { existsSync } from "fs";
import { platform } from "./platform";

export { WISPR_FLOW_BUNDLE_ID } from "./platform";

export function getDbPath(): string {
  const { databasePath } = getPreferenceValues<Preferences>();
  return databasePath && databasePath.trim() !== ""
    ? databasePath
    : platform.getDefaultDbPath();
}

export function dbExists(): boolean {
  return existsSync(getDbPath());
}

export async function isWisprFlowInstalled(): Promise<boolean> {
  return platform.isWisprFlowInstalled();
}

export async function ensureWisprFlowInstalled(): Promise<boolean> {
  const installed = await isWisprFlowInstalled();
  if (!installed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Wispr Flow is not installed",
      message: "Download from wisprflow.ai",
      primaryAction: {
        title: "Download Wispr Flow",
        onAction: async (toast) => {
          await open("https://wisprflow.ai");
          await toast.hide();
        },
      },
    });
  }
  return installed;
}

export async function openWisprFlow(url: string): Promise<void> {
  return platform.openWisprFlow(url);
}

/**
 * Escapes a string for safe use in SQLite queries.
 * Doubles single quotes (SQL standard escaping) and removes null bytes.
 */
export function escapeSQL(value: string, maxLength = 1000): string {
  return value.slice(0, maxLength).replace(/\0/g, "").replace(/'/g, "''");
}

/**
 * Validates UUID format to prevent injection in ID fields.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUUID(id: string): string {
  if (!UUID_REGEX.test(id)) {
    throw new Error("Invalid UUID");
  }
  return id;
}

/**
 * Executes a write SQL statement (INSERT/UPDATE/DELETE).
 */
export async function writeSQL(sql: string): Promise<void> {
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(getDbPath());
    try {
      db.exec(sql);
    } finally {
      db.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const shouldUseCliFallback =
      message.includes("node:sqlite") ||
      message.includes("databasesync is not a constructor") ||
      message.includes("unknown built-in module");

    if (!shouldUseCliFallback) {
      throw error;
    }

    const { execFile } = await import("node:child_process");

    try {
      await new Promise<void>((resolve, reject) => {
        const child = execFile("sqlite3", [getDbPath()], (err) => {
          if (err) reject(err);
          else resolve();
        });
        child.stdin?.end(sql);
      });
    } catch (cliError) {
      if (
        typeof cliError === "object" &&
        cliError !== null &&
        "code" in cliError &&
        cliError.code === "ENOENT"
      ) {
        throw new Error(
          "Unable to write to the Wispr Flow database because the sqlite3 command line tool is not installed.",
        );
      }

      throw cliError;
    }
  }
}
