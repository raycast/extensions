import { useCallback, useMemo } from "react";
import { useFrecencySorting } from "@raycast/utils";
import { useMe } from "./client";

export type EmojiEntry = [name: string, url: string];

const noop = async () => {};

/**
 * Sorts emojis by the selected order while recording usage for the Most Used order.
 *
 * Only emojis used through Raycast count: Slack's own `emoji_use` ranking is not exposed via its public API.
 */
export function useEmojiRanking(
  entries: EmojiEntry[],
  sortOrder: Preferences.SearchEmojis["emojiSortOrder"],
  scope = "search-emojis",
) {
  const { data: me } = useMe();
  const teamId = me?.teamId;
  const unranked = useMemo(
    () => (sortOrder === "alphabetical" ? [...entries].sort(([a], [b]) => a.localeCompare(b)) : entries),
    [entries, sortOrder],
  );

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
    namespace: `${scope}-${teamId}`,
    sortUnvisited,
  });

  // Ignore uses until the workspace is known so they cannot land in an unread namespace.
  if (!teamId) return { entries: unranked, visitItem: noop, resetRanking: noop };
  return { entries: sortOrder === "most-used" ? ranked : unranked, visitItem, resetRanking };
}
