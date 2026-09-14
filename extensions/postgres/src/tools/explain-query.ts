import { Action, Tool } from "@raycast/api";
import { runQuery } from "../lib/client";
import { connectionInfoRows } from "../lib/confirm";
import { resolveConnection } from "../lib/connections";
import { describeError } from "../lib/format";
import { isReadOnly, normalizeForClassification } from "../lib/sql";

type Input = {
  /**
   * Which saved connection to run against — the profile name, or the database name. Omit it to use
   * the connection the user marked active, which is what they mean unless they said otherwise. Only
   * pass it when the request names a specific database or environment.
   */
  connection?: string;
  /** The statement to explain, written exactly as it would be run. */
  sql: string;
  /**
   * Run the statement for real to get measured timings and row counts instead of planner estimates.
   * Much more informative, but it executes the query — and for a write statement it changes data,
   * which is why that combination asks the user first.
   */
  analyze?: boolean;
};

function plannedStatement(input: Input): string {
  const options = input.analyze ? "ANALYZE, BUFFERS, VERBOSE, COSTS, SETTINGS" : "VERBOSE, COSTS, SETTINGS";
  return `EXPLAIN (${options}) ${input.sql}`;
}

/** Only `EXPLAIN ANALYZE` on a non-read statement can change anything, so only that asks. */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.analyze || isReadOnly(input.sql)) return undefined;
  return {
    style: Action.Style.Destructive,
    message: "EXPLAIN ANALYZE runs this statement for real. Continue?",
    info: [...(await connectionInfoRows(input.connection)), { name: "SQL", value: input.sql }],
  };
};

/** Returns the query plan as PostgreSQL prints it. */
export default async function (input: Input) {
  const connection = await resolveConnection(input.connection);

  // The statement is concatenated after EXPLAIN, so a second statement riding along would run
  // unexplained and unconfirmed.
  if (normalizeForClassification(input.sql).replace(/;\s*$/, "").includes(";")) {
    throw new Error("Explain one statement at a time.");
  }

  const readOnly = isReadOnly(input.sql);
  try {
    // Without ANALYZE, EXPLAIN only plans, so even a write statement is safe to run read-only.
    const result = await runQuery(connection, plannedStatement(input), { readOnly: readOnly || !input.analyze });
    return {
      connection: connection.name,
      analyzed: Boolean(input.analyze),
      durationMs: result.durationMs,
      plan: result.rows.map((row) => String(row["QUERY PLAN"] ?? "")).join("\n"),
    };
  } catch (error) {
    throw new Error(describeError(error));
  }
}
