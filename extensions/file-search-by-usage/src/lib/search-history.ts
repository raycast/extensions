/** What one press of History Back or History Forward should do. */
export type HistoryStep =
  | { kind: "recall"; index: number; query: string }
  | { kind: "clear" }
  | { kind: "refuse"; title: string; message?: string };

/**
 * Move the history cursor one step, or explain why it cannot move.
 *
 * The two directions are deliberately asymmetric: Back off the oldest entry
 * refuses, while Forward off the newest one returns to an empty query, which is
 * where the user was before they started walking backwards.
 */
export function stepSearchHistory(
  history: readonly string[],
  index: number,
  direction: "back" | "forward",
): HistoryStep {
  if (history.length === 0) {
    return direction === "back"
      ? {
          kind: "refuse",
          title: "No earlier searches yet",
          message: "Searches are remembered once you open or enter something.",
        }
      : { kind: "refuse", title: "No earlier searches yet" };
  }
  if (direction === "back") {
    if (index >= history.length - 1)
      return { kind: "refuse", title: "That is the oldest search" };
    const next = index + 1;
    return { kind: "recall", index: next, query: history[next] };
  }
  if (index <= 0) return { kind: "clear" };
  const next = index - 1;
  return { kind: "recall", index: next, query: history[next] };
}
