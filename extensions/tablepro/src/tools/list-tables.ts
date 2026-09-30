import { TableInfo } from "../lib/types";
import { listTables } from "../lib/mcp";

type Input = {
  /** UUID of the TablePro connection. */
  connectionId: string;
  /** Database name. Optional. */
  database?: string;
  /** Schema name. Optional. */
  schema?: string;
};

export default async function tool(input: Input): Promise<TableInfo[]> {
  return listTables(input.connectionId, {
    database: input.database,
    schema: input.schema,
  });
}
