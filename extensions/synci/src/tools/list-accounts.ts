import { mcp } from "../lib/mcp";
import type { ListAccountsInput as Input } from "../lib/mcp-input";

/** Find account IDs, currencies, health, balance timestamps, and synced-history coverage. Read-only. */
export default async function tool(input: Input = {}) {
  return mcp.call("list_accounts", input);
}
