import { callMcpTool } from "../lib/mcp";
import { assertWritable } from "../lib/readonly";
import { UpdateThreadInput, validate } from "../lib/validation";

/**
 * Update properties on a thread. The canonical fields are `markDone`,
 * `markRead`, `markStarred`, `markImportant`, `addLabels`, `removeLabels`,
 * and `moveToFolder`. Pass `lastMessageId` for optimistic-concurrency
 * checks against late-arriving replies.
 *
 * Legacy field names (`archived`, `read`, `starred`) are accepted as
 * deprecated aliases and mapped to the canonical fields above.
 */
type Input = {
  /** The id of the thread to update. */
  threadId: string;
  /**
   * Id of the most recent message you saw on the thread. The server
   * rejects the update if a newer message has arrived since.
   */
  lastMessageId?: string;
  /** Archive (mark done) or un-archive. */
  markDone?: boolean;
  /** Mark read (true) or unread (false). */
  markRead?: boolean;
  /** Star (true) or unstar (false). */
  markStarred?: boolean;
  /** Mark Important / Focused vs Other. */
  markImportant?: boolean;
  /** Labels to add. */
  addLabels?: string[];
  /** Labels to remove. */
  removeLabels?: string[];
  /** Move the thread to a folder (server-defined). */
  moveToFolder?: string;
  /** Deprecated: alias for `markDone`. */
  archived?: boolean;
  /** Deprecated: alias for `markRead`. */
  read?: boolean;
  /** Deprecated: alias for `markStarred`. */
  starred?: boolean;
};

export default async function tool(input: Input): Promise<unknown> {
  assertWritable("update-thread");
  const parsed = validate(UpdateThreadInput, input);
  const args: Record<string, unknown> = { thread_id: parsed.threadId };
  if (parsed.lastMessageId) args.last_message_id = parsed.lastMessageId;

  const markDone = parsed.markDone ?? parsed.archived;
  const markRead = parsed.markRead ?? parsed.read;
  const markStarred = parsed.markStarred ?? parsed.starred;
  if (markDone !== undefined) args.mark_done = markDone;
  if (markRead !== undefined) args.mark_read = markRead;
  if (markStarred !== undefined) args.mark_starred = markStarred;
  if (parsed.markImportant !== undefined) args.mark_important = parsed.markImportant;

  if (parsed.addLabels?.length) args.add_labels = parsed.addLabels;
  if (parsed.removeLabels?.length) args.remove_labels = parsed.removeLabels;
  if (parsed.moveToFolder) args.move_to_folder = parsed.moveToFolder;

  return callMcpTool("update_thread", args);
}
