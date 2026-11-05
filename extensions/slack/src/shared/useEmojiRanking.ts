import { useCallback, useMemo } from "react";
import { useFrecencySorting } from "@raycast/utils";
import { useMe } from "./client";

export type EmojiEntry = [name: string, url: string];

/**
 * Ranks emojis by how often they were used through Raycast, so frequently used ones come first like the
 * "frequently used" ranking in Slack's own picker. Emojis that were never used keep their original order.
 *
 * Only emojis used through Raycast count: Slack's own `emoji_use` ranking is not exposed via its public API.
 */
export function useEmojiRanking(entries: EmojiEntry[], scope = "search-emojis") {
  const { data: me } = useMe();

  // `useFrecencySorting` sorts in place and keeps reusing the same array when the ranking changes. Without the
  // copy it would mutate the caller's array; without an explicit order for unvisited emojis, one whose ranking
  // was reset would stay where the previous sort left it (near the top) until the command is reopened.
  const rankable = useMemo(() => [...entries], [entries]);
  const originalIndex = useMemo(() => new Map(entries.map(([name], index) => [name, index])), [entries]);
  const sortUnvisited = useCallback(
    ([a]: EmojiEntry, [b]: EmojiEntry) => (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0),
    [originalIndex],
  );

  const {
    data: ranked,
    visitItem,
    resetRanking,
  } = useFrecencySorting(rankable, {
    key: ([name]) => name,
    namespace: `${scope}-${me?.teamId}`,
    sortUnvisited,
  });

  return { entries: ranked, visitItem, resetRanking };
}
