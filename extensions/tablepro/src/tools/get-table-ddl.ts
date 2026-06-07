import { getTableDDL } from "../lib/mcp";

type Input = {
  /** UUID of the TablePro connection. */
  connectionId: string;
  /** Table name. */
  table: string;
  /** Schema name. Optional. */
  schema?: string;
};

export default async function tool(input: Input): Promise<{ ddl: string }> {
  return getTableDDL(input.connectionId, input.table, {
    schema: input.schema,
  });
}
