import { Action, Tool } from "@raycast/api";
import { runQuery } from "../lib/client";
import { getActiveConnection } from "../lib/connections";
import { isRows, summarizeWrite } from "../lib/format";

type Input = {
  /** The SQL statement to run, e.g. "SELECT * FROM users LIMIT 10". */
  sql: string;
};

const READ_ONLY = /^\s*(select|show|describe|desc|explain|with)\b/i;

/** Confirm before running anything that isn't clearly read-only. */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (READ_ONLY.test(input.sql)) return undefined;
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
