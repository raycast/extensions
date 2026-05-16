import { callMcpTool } from "../lib/mcp";

/**
 * List Superhuman inbox splits (e.g. "Important", "Other", "News", "Calendar").
 * Use the returned split ids with list-threads to filter.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
type Input = {};

export default async function tool(input: Input): Promise<unknown> {
  void input;
  return callMcpTool("list_splits", {});
}
