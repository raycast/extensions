import { Action, Tool } from "@raycast/api";
import { runQuery } from "../lib/client";
import { connectionInfoRows } from "../lib/confirm";
import { resolveConnection } from "../lib/connections";
import { describeError, summarizeWrite } from "../lib/format";
import { recordHistory } from "../lib/history";

type Input = {
  /**
   * Which saved connection to run against — the profile name, or the database name. Omit it to use
   * the connection the user marked active, which is what they mean unless they said otherwise. Only
   * pass it when the request names a specific database or environment.
   */
  connection?: string;
  /** The statement to run, e.g. "UPDATE users SET status = 'active' WHERE id = 5". */
  sql: string;
};

const MAX_TOOL_ROWS = 100;

/**
 * Always confirms — this tool exists precisely for statements that change something, so there is
 * no case where skipping the prompt would be right. The connection and the full statement are
 * shown, because "which database" is the part a user is most likely to get wrong.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Destructive,
    message: "Run this statement against PostgreSQL?",
    info: [...(await connectionInfoRows(input.connection)), { name: "SQL", value: input.sql }],
  };
};

/** Runs a data- or schema-changing statement against the active connection. */
export default async function (input: Input) {
  const connection = await resolveConnection(input.connection);

  try {
    const result = await runQuery(connection, input.sql);
    const outcome = summarizeWrite(result.command, result.rowCount);
    await recordHistory({
      sql: input.sql,
      connectionName: connection.name,
      durationMs: result.durationMs,
      outcome,
      succeeded: true,
    });

    // `INSERT … RETURNING` and friends come back with rows worth handing to the model.
    if (result.rows.length > 0) {
      const truncated = result.truncated || result.rows.length > MAX_TOOL_ROWS;
      return {
        connection: connection.name,
        result: outcome,
        durationMs: result.durationMs,
        truncated,
        rows: result.rows.slice(0, MAX_TOOL_ROWS),
      };
    }
    return { connection: connection.name, result: outcome, durationMs: result.durationMs };
  } catch (error) {
    await recordHistory({
      sql: input.sql,
      connectionName: connection.name,
      durationMs: 0,
      outcome: describeError(error),
      succeeded: false,
    });
    throw new Error(describeError(error));
  }
}
