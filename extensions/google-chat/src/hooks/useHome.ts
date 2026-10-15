import { useCachedPromise } from "@raycast/utils";
import { useMemo, useRef } from "react";

import { loadReadPage, loadUnreadExtras, unreadPreviewInputs, type ReadCursor } from "../api/home";
import type { UnreadSpace } from "../api/unread";
import { showChatError } from "../helpers/feedback";

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
