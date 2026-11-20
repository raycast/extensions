import { mcp } from "../lib/mcp";

/** Read bank/provider connection health, consent expiry, and sync status. Does not reconnect or sync. */
export default async function tool() {
  return mcp.call("list_connections");
}
