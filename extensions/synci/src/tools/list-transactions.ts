import { mcp } from "../lib/mcp";
import type { ListTransactionsInput as Input } from "../lib/mcp-input";

/** Read one page of transactions. Follow meta.has_more/next_cursor, even on short or empty pages. */
export default async function tool(input: Input = {}) {
  return mcp.call("list_transactions", input);
}
