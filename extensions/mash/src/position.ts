// Where a reading view's passage sits in its chat.
import type { ChatView, Passage } from "./mash";

/**
 * Where the shown passages sit in the whole chat: how many messages come
 * before and after them, and the match's place. Each is known only when Mash
 * gave the chat's message count and the messages' places in it.
 */
export interface ChatPosition {
  readonly total?: number;
  /** The match's place, counting from 1. */
  readonly match?: number;
  readonly earlier?: number;
  readonly later?: number;
}

export function chatPosition(view: ChatView, passages: readonly Passage[]): ChatPosition {
  const shown = passages.flatMap((passage) => (passage.kind === "message" ? [passage] : []));
  const first = shown[0]?.message.ordinal;
  const last = shown[shown.length - 1]?.message.ordinal;
  const match = shown.find((passage) => passage.match)?.message.ordinal;
  const { total } = view;
  return {
    ...(total !== undefined ? { total } : {}),
    ...(match !== undefined ? { match: match + 1 } : {}),
    ...(first !== undefined ? { earlier: first } : {}),
    ...(total !== undefined && last !== undefined && last < total ? { later: total - 1 - last } : {}),
  };
}

/** The message count as the reading view's sidebar says it: "14 · match is message 4". */
export function messageCount(position: ChatPosition): string | undefined {
  if (position.total === undefined) return undefined;
  return position.match === undefined
    ? String(position.total)
    : `${position.total} · match is message ${position.match}`;
}
