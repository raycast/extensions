import { ConnectionStatus } from "../lib/types";
import { getConnectionStatus } from "../lib/mcp";

type Input = {
  /** UUID of the TablePro connection. Get this from list-connections. */
  connectionId: string;
};

export default async function tool(input: Input): Promise<ConnectionStatus> {
  return getConnectionStatus(input.connectionId);
}
