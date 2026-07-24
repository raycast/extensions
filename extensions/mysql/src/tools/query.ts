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

// Strip SQL comments before classifying so they can't hide a write keyword. MySQL executable
// comments (/*! ... */) actually run on the server, so we keep their content (drop only the
// delimiters) — otherwise a hidden `INTO OUTFILE` could execute without confirmation.
function stripComments(sql: string): string {
  return sql
    .replace(/\/\*![0-9]*/g, " ") // executable-comment opener: keep the inner SQL
    .replace(/\/\*[\s\S]*?\*\//g, " ") // ordinary block comments: remove entirely
    .replace(/\*\//g, " ") // leftover executable-comment closers
    .replace(/--[^\n]*/g, " ")
    .replace(/#[^\n]*/g, " ");
}

/** Read-only iff it starts with a read verb (or a CTE) and contains no write keyword or file write. */
function isReadOnly(sql: string): boolean {
  const trimmed = stripComments(sql).trim();
  if (FILE_WRITE.test(trimmed) || WRITE_KEYWORD.test(trimmed)) return false;
  return READ_ONLY_PREFIX.test(trimmed) || /^\s*with\b/i.test(trimmed);
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
