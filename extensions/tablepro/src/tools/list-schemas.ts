import { SchemaInfo } from "../lib/types";
import { listSchemas } from "../lib/mcp";

type Input = {
  /** UUID of the TablePro connection. */
  connectionId: string;
  /** Database to list schemas for. Optional for engines that don't separate databases and schemas. */
  database?: string;
};

export default async function tool(input: Input): Promise<SchemaInfo[]> {
  return listSchemas(input.connectionId, { database: input.database });
}
