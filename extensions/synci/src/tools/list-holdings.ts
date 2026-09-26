import { mcp } from "../lib/mcp";
import type { ListHoldingsInput as Input } from "../lib/mcp-input";

/** Read investment and crypto positions at the last sync. Bank accounts normally have no holdings. */
export default async function tool(input: Input = {}) {
  return mcp.call("list_holdings", input);
}
