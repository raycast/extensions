import { callMcpTool } from "../lib/mcp";

/**
 * Update properties on a thread: archive/unarchive, mark read/unread, star/unstar, add/remove labels.
 * Pass only the fields you want to change.
 */
type Input = {
  /**
   * The id of the thread to update.
   */
  threadId: string;
  /**
   * Whether the thread should be archived.
   */
  archived?: boolean;
  /**
   * Whether the thread should be marked read (true) or unread (false).
   */
  read?: boolean;
  /**
   * Whether the thread should be starred.
   */
  starred?: boolean;
  /**
   * Labels to add to the thread.
   */
  addLabels?: string[];
  /**
   * Labels to remove from the thread.
   */
  removeLabels?: string[];
};

export default async function tool(input: Input): Promise<unknown> {
  const args: Record<string, unknown> = { thread_id: input.threadId };
  if (input.archived !== undefined) args.archived = input.archived;
  if (input.read !== undefined) args.read = input.read;
  if (input.starred !== undefined) args.starred = input.starred;
  if (input.addLabels?.length) args.add_labels = input.addLabels;
  if (input.removeLabels?.length) args.remove_labels = input.removeLabels;
  return callMcpTool("update_thread", args);
}
