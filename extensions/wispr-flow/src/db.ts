import {
  getPreferenceValues,
  getApplications,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

export const WISPR_FLOW_BUNDLE_ID = "com.electron.wispr-flow";

const DEFAULT_DB = resolve(
  homedir(),
  "Library/Application Support/Wispr Flow/flow.sqlite",
);

export function getDbPath(): string {
  const { databasePath } = getPreferenceValues<Preferences>();
  return databasePath && databasePath.trim() !== "" ? databasePath : DEFAULT_DB;
}

export function dbExists(): boolean {
  return existsSync(getDbPath());
}

export async function isWisprFlowInstalled(): Promise<boolean> {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === WISPR_FLOW_BUNDLE_ID);
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
 * executeSQL from @raycast/utils opens the database read-only.
 * Use this for INSERT/UPDATE/DELETE operations via the sqlite3 CLI.
 */
export function writeSQL(sql: string): void {
  const dbPath = getDbPath();
  try {
    execFileSync("sqlite3", [dbPath], {
      input: sql,
      encoding: "utf-8",
      timeout: 5000,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("ENOENT")) {
      throw new Error(
        "sqlite3 not found. macOS should include it by default. Please ensure sqlite3 is installed and in your PATH.",
      );
    }
    throw error;
  }
}
