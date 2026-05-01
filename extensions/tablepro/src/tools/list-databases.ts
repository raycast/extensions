import { DatabaseInfo } from "../lib/types";
import { listDatabases } from "../lib/mcp";

type Input = {
  /** UUID of the TablePro connection. Get this from list-connections. */
  connectionId: string;
};

export default async function tool(input: Input): Promise<DatabaseInfo[]> {
  return listDatabases(input.connectionId);
}
