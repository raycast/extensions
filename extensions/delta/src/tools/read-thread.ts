import { isDeltaError } from "../lib/cli";
import { getThreadSummary } from "../lib/delta";
import { getThreadDeeplink, getThreadTitle } from "../lib/threads";

type Input = {
  /** The thread's `id` exactly as `find-threads` returned it. Never guess or shorten an ID. */
  threadId: string;
};

// Keeps very long threads from crowding out the rest of the conversation.
const MAX_TRANSCRIPT_LENGTH = 40_000;

/**
 * Reads one Delta thread: its summary, goals and a compact transcript of the conversation
 * between the user and the coding agent (tool output is left out). Use it before answering
 * anything about what was decided, done or left to do in a thread.
 */
export default async function readThread(input: Input) {
  let thread;
  try {
    thread = await getThreadSummary(input.threadId);
  } catch (error) {
    if (isDeltaError(error, "unreadable-thread")) {
      throw new Error(
        "Delta can't load this thread's history, so its transcript isn't available. Answer from the summary that find-threads returned and say the full conversation couldn't be read.",
      );
    }
    if (isDeltaError(error, "thread-not-found")) {
      throw new Error(`No Delta thread has the ID ${input.threadId}. Get IDs from find-threads.`);
    }
    throw error;
  }

  const transcript = thread.transcript ?? "";
  const isTruncated = transcript.length > MAX_TRANSCRIPT_LENGTH;
  const messages = thread.messages ?? [];
  return {
    id: thread.id,
    title: getThreadTitle(thread),
    summary: thread.summary ?? undefined,
    goals: thread.intents ?? [],
    keywords: thread.keywords ?? [],
    messageCount: messages.length,
    lastMessageAt: messages.at(-1)?.created_at_utc,
    // Keep the end: the latest messages say where the thread stands.
    transcript: isTruncated ? transcript.slice(-MAX_TRANSCRIPT_LENGTH) : transcript,
    transcriptNote: isTruncated ? "Transcript truncated: only the most recent part is included." : undefined,
    link: getThreadDeeplink(thread),
  };
}
