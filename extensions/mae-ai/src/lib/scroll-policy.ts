import { responseRows } from "./response-rows";
import { Turn } from "./session";

export function latestResponseItemId(
  turns: Turn[],
  rich = false,
): string | undefined {
  const turn = turns.at(-1);
  if (!turn) return undefined;
  const prefix = `turn-${turn.id}`;
  if (turn.status === "error") return `${prefix}-error`;
  if (turn.status === "stopped") return `${prefix}-stopped`;
  const rows = responseRows(turn.answer);
  if (rich || rows.length)
    return `${prefix}-answer-${rich ? 0 : rows.length - 1}`;
  return `${prefix}-query-${rich ? 0 : responseRows(turn.query).length - 1}`;
}

export function conversationPresentation(turns: Turn[], rich: boolean) {
  const entries = turns.map((turn) => ({
    turn,
    queryRows: (rich ? [turn.query] : responseRows(turn.query)).map(
      (text, index) => ({
        id: `turn-${turn.id}-query-${index}`,
        text,
      }),
    ),
    answerRows: (rich ? [turn.answer] : responseRows(turn.answer)).map(
      (text, index) => ({
        id: `turn-${turn.id}-answer-${index}`,
        text,
      }),
    ),
  }));
  const itemIds = entries.flatMap(({ turn, queryRows, answerRows }) => [
    ...queryRows.map((row) => row.id),
    ...answerRows.map((row) => row.id),
    ...(turn.status === "streaming" && !answerRows.length
      ? [`turn-${turn.id}-status`]
      : []),
    ...(turn.status === "error" ? [`turn-${turn.id}-error`] : []),
    ...(turn.status === "stopped" ? [`turn-${turn.id}-stopped`] : []),
  ]);
  return { entries, itemIds, latestId: latestResponseItemId(turns, rich) };
}

export class FollowLatestPolicy {
  following = true;
  selectedId: string | undefined;
  private expectedSelections = new Map<string, number>();
  private lastMove = -Infinity;

  expectSelection(id: string, now = performance.now()) {
    this.selectedId = id;
    this.lastMove = now;
    this.expectedSelections.set(id, now);
    if (this.expectedSelections.size > 64) {
      this.expectedSelections.delete(
        this.expectedSelections.keys().next().value!,
      );
    }
  }

  selection(latestId: string | undefined, visible: ReadonlySet<string>) {
    if (this.selectedId && visible.has(this.selectedId)) return this.selectedId;
    return this.following && latestId && visible.has(latestId)
      ? latestId
      : undefined;
  }

  nextScroll(
    latestId: string | undefined,
    streaming: boolean,
    now = performance.now(),
  ) {
    if (!this.following || !latestId) return undefined;
    if (latestId === this.selectedId) {
      return undefined;
    }
    return {
      id: latestId,
      delay: streaming ? Math.max(0, 120 - (now - this.lastMove)) : 0,
    };
  }

  select(
    id: string | null,
    _latestId: string | undefined,
    visible: ReadonlySet<string>,
    now = performance.now(),
  ): boolean {
    if (!id || !visible.has(id)) return this.following;
    // The API gives no input origin: redraws, typing, and user navigation look alike.
    // Follow mode therefore stays locked until explicitly paused.
    if (this.following) return true;
    if (id === this.selectedId) return this.following;
    const expected = this.expectedSelections.get(id);
    // Native lists can repeat or delay callbacks for the previous controlled selection.
    if (expected !== undefined && now - expected <= 500) return this.following;
    this.selectedId = id;
    return false;
  }

  pause() {
    this.following = false;
  }

  resume() {
    this.following = true;
  }
}
