import { callAregTool } from "../lib/mcp";

type Input = {
  /**
   * One read-only SQL statement (SELECT, WITH, FROM or DESCRIBE) in the DuckDB dialect.
   */
  sql: string;
  /**
   * Maximum number of rows.
   */
  limit?: number;
};

export default async function tool(input: Input) {
  return callAregTool("query", input);
}
