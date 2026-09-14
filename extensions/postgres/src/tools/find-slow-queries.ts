import { findSlowQueries, MissingExtensionError } from "../lib/client";
import { defaultConnectionWarning, resolveConnection } from "../lib/connections";
import { describeError } from "../lib/format";

type Input = {
  /**
   * Which saved connection to run against — the profile name, or the database name. Omit it to use
   * the connection the user marked active, which is what they mean unless they said otherwise. Only
   * pass it when the request names a specific database or environment.
   */
  connection?: string;
  /** How many statements to return. Defaults to 20, capped at 100. */
  limit?: number;
  /**
   * "total" ranks by the time the server has spent on a statement overall — the right lens for
   * "where does the load come from". "mean" ranks by time per call, which surfaces rare but
   * expensive statements.
   */
  orderBy?: "total" | "mean";
};

/** Reads pg_stat_statements, the server's own record of what it spends time on. */
export default async function (input: Input) {
  const connection = await resolveConnection(input.connection);

  try {
    const queries = await findSlowQueries(connection, { limit: input.limit, orderBy: input.orderBy });
    return {
      connection: connection.name,
      database: connection.database,
      warning: await defaultConnectionWarning(connection, Boolean(input.connection)),
      orderedBy: input.orderBy === "mean" ? "mean execution time" : "total execution time",
      queries,
    };
  } catch (error) {
    // Not installed is a fact about the database, not a transient failure — say so plainly so the
    // model reports it instead of trying again.
    if (error instanceof MissingExtensionError) {
      return { connection: connection.name, queries: [], error: error.message };
    }
    throw new Error(describeError(error));
  }
}
