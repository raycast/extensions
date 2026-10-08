import { FmError } from "./errors";
import { ChatMessage } from "./transcript";

/** Counts the tokens of a request that sends `history` before the new prompt. */
export type MeasureTokens = (history: ChatMessage[]) => Promise<number>;

/** Indexes where each turn (a user message and its answers) starts. */
export function turnStarts(history: ChatMessage[]): number[] {
  const starts: number[] = [];
  history.forEach((message, index) => {
    if (message.role === "user" || index === 0) starts.push(index);
  });
  return starts;
}

/**
 * Returns the newest part of the history that fits in `budget` tokens together with the new prompt.
 * Whole turns are left out, oldest first. A binary search over the number of left-out turns keeps the
 * number of `fm count-tokens` calls small, whatever the language and length of the chat.
 */
export async function fitHistory(
  history: ChatMessage[],
  budget: number,
  measure: MeasureTokens,
  signal?: AbortSignal,
): Promise<{ history: ChatMessage[]; tokens: number; droppedMessages: number }> {
  const checkStopped = () => {
    if (signal?.aborted) throw new FmError("cancelled", "Stopped.");
  };
  const starts = turnStarts(history);
  const keepFrom = (dropped: number) => history.slice(dropped >= starts.length ? history.length : starts[dropped]);

  checkStopped();
  const allTokens = await measure(history);
  if (allTokens <= budget || starts.length === 0) {
    return { history, tokens: allTokens, droppedMessages: 0 };
  }

  // Find the smallest number of dropped turns that fits. Dropping every turn always "fits": the prompt alone
  // is checked by the caller.
  let low = 1;
  let high = starts.length;
  let best = { dropped: starts.length, tokens: -1 };
  while (low <= high) {
    checkStopped();
    const middle = Math.floor((low + high) / 2);
    const tokens = await measure(keepFrom(middle));
    if (tokens <= budget) {
      best = { dropped: middle, tokens };
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  const kept = keepFrom(best.dropped);
  checkStopped();
  const tokens = best.tokens >= 0 ? best.tokens : await measure(kept);
  return { history: kept, tokens, droppedMessages: history.length - kept.length };
}
