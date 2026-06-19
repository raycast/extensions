import {
  Connection,
  TableProNotInstalledError,
  TokenMissingError,
} from "../lib/types";
import { loadConnections } from "../lib/connections";
import { listConnections } from "../lib/mcp";

/**
 * List all saved TablePro connections by id, name, type, host, and port. Call
 * this first when the user names a connection so other tools can use the id.
 *
 * Falls back to reading `connections.json` directly when the MCP call fails for
 * transport reasons so the model can still surface what is available. Token
 * and install errors propagate so the model can prompt the user to pair or
 * install instead of returning stale data with no signal.
 */
export default async function tool(): Promise<Connection[]> {
  try {
    return await listConnections();
  } catch (err) {
    if (
      err instanceof TokenMissingError ||
      err instanceof TableProNotInstalledError
    ) {
      throw err;
    }
    return loadConnections();
  }
}
