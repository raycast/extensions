import { mcp } from "../lib/mcp";
import type { AccountBalanceInput as Input } from "../lib/mcp-input";

/** Read recent balance snapshots and broker-reported totals. Check as_of; these are not live balances. */
export default async function tool(input: Input) {
  return mcp.call("get_account_balance", input);
}
