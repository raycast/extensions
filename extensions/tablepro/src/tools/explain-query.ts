import { QueryResult } from "../lib/types";
import { explainQuery } from "../lib/mcp";

type Input = {
  /** UUID of the TablePro connection. */
  connectionId: string;
  /** SQL to explain. The tool wraps it with EXPLAIN before running. */
  sql: string;
  /** Database to scope the query to. Optional. */
  database?: string;
  /** Schema to scope the query to. Optional. */
  schema?: string;
};

export default async function tool(input: Input): Promise<QueryResult> {
  return explainQuery(input.connectionId, input.sql, {
    database: input.database,
    schema: input.schema,
  });
}
