import { runQuery } from "../lib/client";
import { defaultConnectionWarning, resolveConnection } from "../lib/connections";
import { describeError, summarizeWrite } from "../lib/format";
import { isReadOnly } from "../lib/sql";
import { recordHistory } from "../lib/history";

type Input = {
  /**
   * Which saved connection to run against — the profile name, or the database name. Omit it to use
   * the connection the user marked active, which is what they mean unless they said otherwise. Only
   * pass it when the request names a specific database or environment.
   */
  connection?: string;
  /** A single read-only SQL statement, e.g. "SELECT id, email FROM users ORDER BY id DESC LIMIT 10". */
  sql: string;
};

// Cap what goes back to the model so one wide SELECT does not fill the context window.
const MAX_TOOL_ROWS = 100;

/**
 * Runs a read-only statement without asking the user — which is safe because of two gates:
 * {@link isReadOnly} rejects anything it cannot prove is a read (a write keyword, a second
 * statement, `SELECT … INTO`), and the statement then runs inside a `READ ONLY` transaction, so
 * the server refuses any write the classifier let through.
 */
export default async function (input: Input) {
  const connection = await resolveConnection(input.connection);

  if (!isReadOnly(input.sql)) {
    throw new Error(
      "This statement is not read-only. Use the run-write-query tool instead — it asks the user to confirm before anything changes.",
    );
  }

  try {
    const result = await runQuery(connection, input.sql, { readOnly: true });
    await recordHistory({
      sql: input.sql,
      connectionName: connection.name,
      durationMs: result.durationMs,
      outcome: summarizeWrite(result.command, result.rowCount),
      succeeded: true,
    });

    const truncated = result.truncated || result.rows.length > MAX_TOOL_ROWS;
    return {
      connection: connection.name,
      database: connection.database,
      warning: await defaultConnectionWarning(connection, Boolean(input.connection)),
      rowCount: result.totalRows,
      durationMs: result.durationMs,
      truncated,
      rows: result.rows.slice(0, MAX_TOOL_ROWS),
    };
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
