// Where a glance's match sits in its chat.
import type { ChatView, Glimpse } from "./mash";

/**
 * How many messages the chat has and the match's place among them. Each is
 * known only when Mash gave the chat's message count and the message's place.
 */
export interface ChatPosition {
  readonly total?: number;
  /** The match's place, counting from 1. */
  readonly match?: number;
}

export function chatPosition(view: ChatView, glimpses: readonly Glimpse[]): ChatPosition {
  const match = glimpses.find((glimpse) => glimpse.match)?.message.ordinal;
  const { total } = view;
  return {
    ...(total !== undefined ? { total } : {}),
    ...(match !== undefined ? { match: match + 1 } : {}),
  };
}

/** The message count as the glance says it: "14 · match is message 4". */
export function messageCount(position: ChatPosition): string | undefined {
  if (position.total === undefined) return undefined;
  return position.match === undefined
    ? String(position.total)
    : `${position.total} · match is message ${position.match}`;
}
