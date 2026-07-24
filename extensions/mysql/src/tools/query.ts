import { Action, Tool } from "@raycast/api";
import { runQuery } from "../lib/client";
import { getActiveConnection } from "../lib/connections";
import { isRows, summarizeWrite } from "../lib/format";

type Input = {
  /** The SQL statement to run, e.g. "SELECT * FROM users LIMIT 10". */
  sql: string;
};

const READ_ONLY_PREFIX = /^\s*(select|show|describe|desc|explain)\b/i;
const WRITE_KEYWORD =
  /\b(insert|update|delete|replace|merge|create|drop|alter|truncate|rename|grant|revoke|call|set)\b/i;

// `SELECT … INTO OUTFILE/DUMPFILE` writes to the filesystem, so it is never read-only.
const FILE_WRITE = /\binto\s+(outfile|dumpfile)\b/i;

/** A CTE (`WITH …`) is read-only only when it contains no write keyword; anything else is judged by its prefix. */
function isReadOnly(sql: string): boolean {
  const trimmed = sql.trim();
  if (FILE_WRITE.test(trimmed)) return false;
  if (READ_ONLY_PREFIX.test(trimmed)) return true;
  if (/^\s*with\b/i.test(trimmed)) return !WRITE_KEYWORD.test(trimmed);
  return false;
}

/** Confirm before running anything that isn't clearly read-only. */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (isReadOnly(input.sql)) return undefined;
  const connection = await getActiveConnection();
  return {
    style: Action.Style.Destructive,
    message: "Run this statement against MySQL?",
    info: [
      { name: "Connection", value: connection?.name },
      { name: "SQL", value: input.sql },
    ],
  };
};

/**
 * Runs a SQL statement against the active MySQL connection (the default saved connection,
 * or the preferences fallback) and returns the rows or a write summary.
 */
export default async function (input: Input) {
  const connection = await getActiveConnection();
  if (!connection) {
    throw new Error("No MySQL connection configured. Add one with the Manage Connections command.");
  }

  const result = await runQuery(connection, input.sql);
  if (isRows(result.rows)) {
    return {
      connection: connection.name,
      rowCount: result.rows.length,
      durationMs: result.durationMs,
      rows: result.rows,
    };
  }
  return { connection: connection.name, durationMs: result.durationMs, result: summarizeWrite(result.rows) };
}
