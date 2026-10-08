import { list } from "../lib/jovida";
import { toolPreflight } from "../lib/tool-helpers";
import { ListScope, Priority, TodoStatus } from "../lib/types";

type Input = {
  /**
   * Time window. "today" (default), "upcoming" (future), "recent" (past),
   * "range" (needs from/to), or "all".
   */
  scope?: ListScope;
  /** Completion filter: "pending" (default), "completed", or "all". */
  status?: TodoStatus | "all";
  /** Case-insensitive substring match on title + description. */
  query?: string;
  /** Exact category match. */
  category?: string;
  /** Priority filter. */
  priority?: Priority;
  /** Range start, YYYY-MM-DD. Only with scope "range". */
  from?: string;
  /** Range end, YYYY-MM-DD. Only with scope "range". */
  to?: string;
  /** Max number of todos (default 20). */
  limit?: number;
};

/**
 * List, search, and filter the user's Jovida todos. Use this first to read
 * current todos and obtain each todo's entry_id before updating, completing,
 * or deleting. Returns { todos, total, has_more }. If has_more is true the
 * result was truncated by limit — raise limit or narrow the query.
 */
export default async function tool(input: Input) {
  const blocked = await toolPreflight();
  if (blocked) return blocked;
  return list({ ...input, full: true });
}
