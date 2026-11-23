import { Action, Tool } from "@raycast/api";
import { DeltaError } from "../lib/cli";
import { listThreads, setThreadArchived } from "../lib/delta";
import { getThreadTitle } from "../lib/threads";

type Input = {
  /** The thread's `id` exactly as `find-threads` returned it. Never guess or shorten an ID. */
  threadId: string;
  /** Set to true to bring an archived thread back to the active list. Defaults to false, which archives the thread. */
  unarchive?: boolean;
};

async function findThread(threadId: string) {
  return (await listThreads()).find((thread) => thread.id === threadId);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Show the title, not just an ID, so the user can tell which thread they're approving.
  const thread = await findThread(input.threadId).catch(() => undefined);
  return {
    style: Action.Style.Regular,
    message: input.unarchive ? "Unarchive this Delta thread?" : "Archive this Delta thread?",
    info: [{ name: "Thread", value: thread ? getThreadTitle(thread) : input.threadId }],
  };
};

/**
 * Archives one Delta thread, or unarchives it. Archiving only moves the thread out of the active
 * list; nothing is deleted and it can be unarchived later. Call it only when the user asks to
 * archive or unarchive, once per thread.
 */
export default async function archiveThread(input: Input) {
  const archived = !input.unarchive;
  const thread = await findThread(input.threadId);
  if (!thread) {
    throw new DeltaError("other", `No Delta thread has the ID ${input.threadId}. Get IDs from find-threads.`);
  }
  const title = getThreadTitle(thread);
  if (thread.archived === archived) {
    return { id: thread.id, title, archived, note: `The thread was already ${archived ? "archived" : "active"}.` };
  }
  await setThreadArchived(thread, archived);
  return { id: thread.id, title, archived };
}
