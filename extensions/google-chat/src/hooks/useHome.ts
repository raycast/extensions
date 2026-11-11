import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  loadLatestDetails,
  loadMentions,
  loadReadPage,
  loadUnreadExtras,
  unreadPreviewInputs,
  type HomeRow,
  type ReadCursor,
} from "../api/home";
import type { UnreadSpace } from "../api/unread";
import { showChatError } from "../helpers/feedback";
import { withLatestDetails, type LatestDetails } from "../helpers/my-messages";

/**
 * Read conversations for My Messages, most recently active first, 25 per page via the List `pagination` prop.
 * Only runs when `execute` is true (the All view, once an unread result is known). The rows include the
 * conversations unread when each page loaded, so the caller splits Unread from Read against the latest
 * unread result (`splitSections`).
 */
export function useReadConversations(execute: boolean, unread: UnreadSpace[]) {
  // Read through a ref: a new unread result changes only which rows show (at render), so it doesn't reload pages.
  const unreadRef = useRef(unread);
  unreadRef.current = unread;
  const result = useCachedPromise(
    () =>
      ({ page, cursor }: { page: number; cursor?: ReadCursor }) =>
        loadReadPage(page, cursor, unreadRef.current),
    [],
    {
      execute,
      keepPreviousData: true,
      onError: (error) => showChatError(error, () => result.revalidate()),
    },
  );
  return result;
}

/** Preview names and "You replied" for the Unread section. Failures only cost those details. */
export function useUnreadExtras(entries: UnreadSpace[]) {
  const inputs = useMemo(() => unreadPreviewInputs(entries), [entries]);
  const { data } = useCachedPromise(loadUnreadExtras, [inputs], {
    keepPreviousData: true,
    onError: (error) => console.error("Could not load unread details", error),
  });
  return data ?? { names: {}, replied: [] };
}

/**
 * Recent messages that mention the user, for the Mentions section. A failure is only logged, so it never
 * breaks the rest of the list; the section then offers Retry.
 */
export function useMentions(days: number, limit: number) {
  return useCachedPromise(loadMentions, [days, limit], {
    keepPreviousData: true,
    onError: (error) => console.error("Could not load mentions", error),
  });
}

/** A moved row's key: its conversation and the unread message its row was built from. */
function movedKey(row: HomeRow): string {
  return `${row.item.space.name}|${row.preview?.name ?? ""}`;
}

/**
 * Read rows with up-to-date details for the ones built from unread data (conversations marked as read, or
 * read elsewhere, since their page loaded). Each such row's newest messages load once; until then it keeps
 * "You replied" from the Unread section (`replied`, as it was when the row moved). Rows that never move
 * cost no requests.
 */
export function useMovedReadRows(rows: HomeRow[], replied: ReadonlySet<string>): HomeRow[] {
  const [details, setDetails] = useState<Record<string, LatestDetails>>({});
  const requested = useRef(new Set<string>());
  const repliedWhenMoved = useRef(new Map<string, boolean>());
  const moved = rows.filter((row) => row.fromUnread);
  for (const row of moved) {
    const key = movedKey(row);
    if (!repliedWhenMoved.current.has(key)) repliedWhenMoved.current.set(key, replied.has(row.item.space.name));
  }
  const toLoad = moved.filter((row) => !requested.current.has(movedKey(row)));
  const loadKey = toLoad.map(movedKey).join("\n");

  useEffect(() => {
    if (toLoad.length === 0) return;
    const keys = toLoad.map(movedKey);
    keys.forEach((key) => requested.current.add(key));
    loadLatestDetails(toLoad.map((row) => row.item.space.name))
      .then((loaded) =>
        setDetails((current) => {
          const next = { ...current };
          toLoad.forEach((row, i) => {
            const entry = loaded[row.item.space.name];
            if (entry) next[keys[i]] = entry;
          });
          return next;
        }),
      )
      .catch((error) => console.error("Could not load details for conversations that moved to Read", error));
  }, [loadKey]);

  return rows.map((row) => {
    if (!row.fromUnread) return row;
    const key = movedKey(row);
    return withLatestDetails(row, details[key] ?? { youReplied: repliedWhenMoved.current.get(key) ?? false });
  });
}
