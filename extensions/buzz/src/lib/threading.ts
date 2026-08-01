/**
 * Thread-reference reading, mirroring
 * `desktop/src/features/messages/lib/threading.ts` in block/buzz so our idea of
 * what counts as a reply cannot drift from the app the user compares against.
 */

export interface ThreadReference {
  parentId: string | null;
  rootId: string | null;
}

export function getThreadReference(tags: string[][]): ThreadReference {
  const eventTags = tags.filter((tag) => tag[0] === "e" && typeof tag[1] === "string");
  if (eventTags.length === 0) {
    return { parentId: null, rootId: null };
  }
  const rootTag = eventTags.find((tag) => tag[3] === "root");
  const replyTag = [...eventTags].reverse().find((tag) => tag[3] === "reply") ?? null;
  if (!replyTag) {
    return { parentId: null, rootId: null };
  }
  // The eventTags filter above keeps only tags whose second element is a string,
  // so replyTag[1] is always a string here and the ?? null fallback cannot fire.
  // The pragma below only suppresses coverage for its own line because it sits
  // mid-line, deliberately: if this is ever reformatted so the comment starts on
  // its own line, c8 will treat it as covering the next line instead, silently
  // swallowing that line's branches. That exact failure mode is why two other
  // pragmas were already removed from this file; do not reformat it.
  const parentId = replyTag[1] ?? /* c8 ignore next */ null;
  return { parentId, rootId: rootTag?.[1] ?? parentId };
}

/**
 * Buzz's "also send to channel" case. Such a reply stays visible in the channel
 * feed, so hiding every reply would diverge from the app.
 */
export function isBroadcastReply(tags: string[][]): boolean {
  return tags.some((tag) => tag[0] === "broadcast" && tag[1] === "1");
}

/** True when this event should be hidden from the channel list. */
export function isThreadReply(tags: string[][]): boolean {
  return getThreadReference(tags).parentId !== null && !isBroadcastReply(tags);
}
